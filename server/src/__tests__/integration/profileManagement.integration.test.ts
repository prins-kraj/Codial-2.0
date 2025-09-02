import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

describe('Profile Management Integration Tests', () => {
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    // Clean up database
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test users
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'profileuser',
        email: 'profile@example.com',
        password: 'password123'
      });

    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      });

    userToken = userResponse.body.token;
    userId = userResponse.body.user.id;
    otherUserToken = otherUserResponse.body.token;
    otherUserId = otherUserResponse.body.user.id;
  });

  afterEach(async () => {
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Profile Management Workflow', () => {
    test('should handle complete profile management flow', async () => {
      // 1. Get initial profile (should have default values)
      const initialProfileResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(initialProfileResponse.status).toBe(200);
      expect(initialProfileResponse.body.username).toBe('profileuser');
      expect(initialProfileResponse.body.email).toBe('profile@example.com');
      expect(initialProfileResponse.body.bio).toBeNull();
      expect(initialProfileResponse.body.profilePicture).toBeNull();

      // 2. Update profile information
      const updateProfileResponse = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bio: 'This is my updated bio',
          username: 'updatedprofileuser'
        });

      expect(updateProfileResponse.status).toBe(200);
      expect(updateProfileResponse.body.bio).toBe('This is my updated bio');
      expect(updateProfileResponse.body.username).toBe('updatedprofileuser');

      // 3. Verify profile was updated
      const updatedProfileResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(updatedProfileResponse.status).toBe(200);
      expect(updatedProfileResponse.body.bio).toBe('This is my updated bio');
      expect(updatedProfileResponse.body.username).toBe('updatedprofileuser');

      // 4. Other user should be able to view the profile (read-only)
      const otherUserViewResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(otherUserViewResponse.status).toBe(200);
      expect(otherUserViewResponse.body.username).toBe('updatedprofileuser');
      expect(otherUserViewResponse.body.bio).toBe('This is my updated bio');
      // Email should not be visible to other users
      expect(otherUserViewResponse.body.email).toBeUndefined();

      // 5. Other user should not be able to update the profile
      const unauthorizedUpdateResponse = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          bio: 'Trying to hack the profile'
        });

      // This should update the other user's own profile, not the target user's profile
      expect(unauthorizedUpdateResponse.status).toBe(200);

      // Verify original user's profile wasn't changed
      const verifyProfileResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifyProfileResponse.body.bio).toBe('This is my updated bio');
    });

    test('should handle profile picture upload workflow', async () => {
      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      const testImageBuffer = Buffer.from('fake-image-data');
      fs.writeFileSync(testImagePath, testImageBuffer);

      try {
        // Upload profile picture
        const uploadResponse = await request(app)
          .post('/api/users/me/profile/picture')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('profilePicture', testImagePath);

        expect(uploadResponse.status).toBe(200);
        expect(uploadResponse.body.profilePicture).toBeDefined();
        expect(uploadResponse.body.profilePicture).toContain('uploads/');

        // Verify profile picture was saved
        const profileResponse = await request(app)
          .get(`/api/users/${userId}/profile`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(profileResponse.status).toBe(200);
        expect(profileResponse.body.profilePicture).toBe(uploadResponse.body.profilePicture);
      } finally {
        // Clean up test file
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('should handle user status updates', async () => {
      // Update user status
      const statusUpdateResponse = await request(app)
        .put('/api/users/me/status')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'busy'
        });

      expect(statusUpdateResponse.status).toBe(200);
      expect(statusUpdateResponse.body.status).toBe('busy');

      // Verify status was updated in profile
      const profileResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.status).toBe('busy');

      // Other user should see the updated status
      const otherUserViewResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(otherUserViewResponse.status).toBe(200);
      expect(otherUserViewResponse.body.status).toBe('busy');
    });

    test('should validate profile update data', async () => {
      // Test invalid bio (too long)
      const longBio = 'a'.repeat(501); // Assuming 500 char limit
      const invalidBioResponse = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bio: longBio
        });

      expect(invalidBioResponse.status).toBe(400);

      // Test invalid username (too short)
      const invalidUsernameResponse = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'ab' // Too short
        });

      expect(invalidUsernameResponse.status).toBe(400);

      // Test duplicate username
      const duplicateUsernameResponse = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'otheruser' // Already taken by otherUser
        });

      expect(duplicateUsernameResponse.status).toBe(400);
    });
  });
});