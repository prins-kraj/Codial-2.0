import { prisma } from '../config/database';
import { UserSettings } from '@prisma/client';

export interface UserSettingsData {
  theme?: string;
  notifications?: boolean;
  soundEnabled?: boolean;
  emailNotifications?: boolean;
  showOnlineStatus?: boolean;
}

export class UserSettingsRepository {
  // Get user settings by user ID
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return settings;
  }

  // Create default settings for a user
  static async createDefaultSettings(userId: string): Promise<UserSettings> {
    const settings = await prisma.userSettings.create({
      data: {
        userId,
        theme: 'light',
        notifications: true,
        soundEnabled: true,
        emailNotifications: true,
        showOnlineStatus: true,
      },
    });

    return settings;
  }

  // Update user settings
  static async updateUserSettings(
    userId: string,
    data: UserSettingsData
  ): Promise<UserSettings> {
    // First, try to update existing settings
    try {
      const updatedSettings = await prisma.userSettings.update({
        where: { userId },
        data,
      });
      return updatedSettings;
    } catch (error) {
      // If settings don't exist, create them with the provided data
      const defaultSettings = {
        theme: 'light',
        notifications: true,
        soundEnabled: true,
        emailNotifications: true,
        showOnlineStatus: true,
        ...data,
      };

      const newSettings = await prisma.userSettings.create({
        data: {
          userId,
          ...defaultSettings,
        },
      });
      return newSettings;
    }
  }

  // Get or create user settings (ensures settings always exist)
  static async getOrCreateUserSettings(userId: string): Promise<UserSettings> {
    let settings = await this.getUserSettings(userId);

    if (!settings) {
      settings = await this.createDefaultSettings(userId);
    }

    return settings;
  }

  // Delete user settings (for cleanup)
  static async deleteUserSettings(userId: string): Promise<void> {
    await prisma.userSettings.delete({
      where: { userId },
    });
  }
}
