import React, { useState, useEffect } from 'react';
import { User, Settings, Shield, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function SettingsModal({ isOpen, onClose }: SettingsModalProps) {

  // useEffect(() => {
  //   console.log('SettingsModal: isOpen changed to:', isOpen);
  // }, [isOpen]);
  const {
    settings,
    activeTab,
    isLoading,
    error,
    updateSettings,
    changePassword,
    setActiveTab,
    clearError,
  } = useSettings();

  const { user } = useAuth();

  // Local state for form data
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordErrors, setPasswordErrors] = useState<
    Partial<PasswordFormData>
  >({});

  // Clear form data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      clearError();
    }
  }, [isOpen, clearError]);

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  const handleSettingsUpdate = async (updates: Partial<UserSettings>) => {
    if (!settings || !updates) return;

    const success = await updateSettings(updates);
    if (success) {
      toast.success('Settings updated successfully');
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: Partial<PasswordFormData> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    const success = await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    if (success) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Don't render if modal is not open
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="lg"
      className="dark:bg-gray-800"
    >
      <div className="flex h-96">
        {/* Sidebar */}
        <div className="w-48 border-r border-gray-200 dark:border-gray-700 pr-4">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 pl-6">
          {error && (
            <ErrorMessage
              error={error}
              variant="banner"
              className="mb-4"
              onDismiss={() => {
                /* Clear error if needed */
              }}
            />
          )}

          {!settings && isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading settings...</p>
              </div>
            </div>
          )}

          {!settings && !isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-500">No settings available</p>
              </div>
            </div>
          )}

          {settings && (
            <>
              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Account Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Username
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          {user?.username}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Change Password
                    </h3>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? 'text' : 'password'}
                          label="Current Password"
                          value={passwordForm.currentPassword}
                          onChange={e =>
                            setPasswordForm(prev => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          error={passwordErrors.currentPassword}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          type={showPasswords.new ? 'text' : 'password'}
                          label="New Password"
                          value={passwordForm.newPassword}
                          onChange={e =>
                            setPasswordForm(prev => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          error={passwordErrors.newPassword}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          label="Confirm New Password"
                          value={passwordForm.confirmPassword}
                          onChange={e =>
                            setPasswordForm(prev => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          error={passwordErrors.confirmPassword}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={
                          !passwordForm.currentPassword ||
                          !passwordForm.newPassword ||
                          !passwordForm.confirmPassword
                        }
                      >
                        Change Password
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Appearance
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Theme
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['light', 'dark', 'system'] as const).map(theme => (
                            <button
                              key={theme}
                              onClick={() => handleSettingsUpdate({ theme })}
                              className={cn(
                                'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                                settings.theme === theme
                                  ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900 dark:border-primary-700 dark:text-primary-300'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                              )}
                            >
                              {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Notifications
                    </h3>

                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications}
                          onChange={e =>
                            handleSettingsUpdate({
                              notifications: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                          Enable desktop notifications
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.soundEnabled}
                          onChange={e =>
                            handleSettingsUpdate({
                              soundEnabled: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                          Enable notification sounds
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={e =>
                            handleSettingsUpdate({
                              emailNotifications: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                          Enable email notifications
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Privacy Settings
                    </h3>

                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.showOnlineStatus}
                          onChange={e =>
                            handleSettingsUpdate({
                              showOnlineStatus: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                          Show online status to other users
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Account Actions
                    </h3>

                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
                          Danger Zone
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                          Once you delete your account, there is no going back.
                          Please be certain.
                        </p>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement account deletion
                            toast.error(
                              'Account deletion is not yet implemented'
                            );
                          }}
                        >
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default SettingsModal;
