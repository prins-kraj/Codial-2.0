import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Settings Management Integration Tests', () => {
  let userToken: string;
  let userId: string;

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
    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'settingsuser',
        email: 'settings@example.com',
        password: 'password123'
      });

    userToken = userResponse.body.token;
    userId = userResponse.body.user.id;
  });

  afterEach(async () => {
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Settings Management Workflow', () => {
    test('should handle complete settings management flow', async () => {
      // 1. Get initial settings (should have defaults)
      const initialSettingsResponse = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(initialSettingsResponse.status).toBe(200);
      expect(initialSettingsResponse.body.theme).toBe('light');
      expect(initialSettingsResponse.body.notifications).toBe(true);
      expect(initialSettingsResponse.body.soundEnabled).toBe(true);
      expect(initialSettingsResponse.body.emailNotifications).toBe(true);
      expect(initialSettingsResponse.body.showOnlineStatus).toBe(true);

      // 2. Update settings
      const updateSettingsResponse = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'dark',
          notifications: false,
          soundEnabled: false,
          emailNotifications: false,
          showOnlineStatus: false
        });

      expect(updateSettingsResponse.status).toBe(200);
      expect(updateSettingsResponse.body.theme).toBe('dark');
      expect(updateSettingsResponse.body.notifications).toBe(false);
      expect(updateSettingsResponse.body.soundEnabled).toBe(false);
      expect(updateSettingsResponse.body.emailNotifications).toBe(false);
      expect(updateSettingsResponse.body.showOnlineStatus).toBe(false);

      // 3. Verify settings were persisted
      const verifySettingsResponse = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifySettingsResponse.status).toBe(200);
      expect(verifySettingsResponse.body.theme).toBe('dark');
      expect(verifySettingsResponse.body.notifications).toBe(false);
      expect(verifySettingsResponse.body.soundEnabled).toBe(false);
      expect(verifySettingsResponse.body.emailNotifications).toBe(false);
      expect(verifySettingsResponse.body.showOnlineStatus).toBe(false);

      // 4. Update partial settings
      const partialUpdateResponse = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'system',
          notifications: true
        });

      expect(partialUpdateResponse.status).toBe(200);
      expect(partialUpdateResponse.body.theme).toBe('system');
      expect(partialUpdateResponse.body.notifications).toBe(true);
      // Other settings should remain unchanged
      expect(partialUpdateResponse.body.soundEnabled).toBe(false);
      expect(partialUpdateResponse.body.emailNotifications).toBe(false);
    });

    test('should handle password change workflow', async () => {
      // 1. Change password with correct current password
      const changePasswordResponse = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456'
        });

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body.message).toBe('Password updated successfully');

      // 2. Verify old password no longer works
      const oldPasswordLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'settings@example.com',
          password: 'password123'
        });

      expect(oldPasswordLoginResponse.status).toBe(401);

      // 3. Verify new password works
      const newPasswordLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'settings@example.com',
          password: 'newpassword456'
        });

      expect(newPasswordLoginResponse.status).toBe(200);
      expect(newPasswordLoginResponse.body.token).toBeDefined();

      // 4. Try to change password with wrong current password
      const wrongPasswordResponse = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'anothernewpassword'
        });

      expect(wrongPasswordResponse.status).toBe(400);
      expect(wrongPasswordResponse.body.message).toBe('Current password is incorrect');
    });

    test('should validate settings data', async () => {
      // Test invalid theme
      const invalidThemeResponse = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'invalid-theme'
        });

      expect(invalidThemeResponse.status).toBe(400);

      // Test invalid boolean values
      const invalidBooleanResponse = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          notifications: 'not-a-boolean'
        });

      expect(invalidBooleanResponse.status).toBe(400);
    });

    test('should validate password change data', async () => {
      // Test missing current password
      const missingCurrentPasswordResponse = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          newPassword: 'newpassword456'
        });

      expect(missingCurrentPasswordResponse.status).toBe(400);

      // Test weak new password
      const weakPasswordResponse = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123' // Too short
        });

      expect(weakPasswordResponse.status).toBe(400);

      // Test same password
      const samePasswordResponse = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'password123'
        });

      expect(samePasswordResponse.status).toBe(400);
    });

    test('should handle settings persistence across sessions', async () => {
      // Update settings
      await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'dark',
          notifications: false
        });

      // Login again to get new token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'settings@example.com',
          password: 'password123'
        });

      const newToken = loginResponse.body.token;

      // Verify settings persisted
      const settingsResponse = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${newToken}`);

      expect(settingsResponse.status).toBe(200);
      expect(settingsResponse.body.theme).toBe('dark');
      expect(settingsResponse.body.notifications).toBe(false);
    });

    test('should not allow access to other users settings', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const otherUserToken = otherUserResponse.body.token;

      // Update first user's settings
      await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'dark'
        });

      // Other user should get their own settings (defaults)
      const otherUserSettingsResponse = await request(app)
        .get('/api/users/me/settings')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(otherUserSettingsResponse.status).toBe(200);
      expect(otherUserSettingsResponse.body.theme).toBe('light'); // Default, not 'dark'
    });
  });
});