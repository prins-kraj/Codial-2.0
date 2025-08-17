import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterRequest } from '@/types';
import { ValidationUtils } from '@/utils/validation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface RegisterFormData extends RegisterRequest {
  confirmPassword: string;
}

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>();

  const password = watch('password', '');

  // Password strength indicators
  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Contains number', valid: /\d/.test(password) },
    { label: 'Contains special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    clearError();

    // Validate form
    const validationErrors = ValidationUtils.validateRegistrationForm(
      data.username,
      data.email,
      data.password,
      data.confirmPassword
    );
    
    if (ValidationUtils.hasErrors(validationErrors)) {
      Object.entries(validationErrors).forEach(([field, message]) => {
        if (message) {
          setError(field as keyof RegisterFormData, { message });
        }
      });
      return;
    }

    // Attempt registration
    const success = await registerUser({
      username: data.username,
      email: data.email,
      password: data.password,
    });
    
    if (success) {
      toast.success('Account created successfully! Welcome to the chat!');
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="Username"
              type="text"
              autoComplete="username"
              placeholder="Choose a username"
              error={errors.username?.message}
              helperText="3-20 characters, letters, numbers, underscores, and hyphens only"
              {...register('username', { required: 'Username is required' })}
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
                error={errors.password?.message}
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Password requirements:</p>
                <div className="space-y-1">
                  {passwordChecks.map((check, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {check.valid ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm ${
                          check.valid ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', { required: 'Please confirm your password' })}
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterForm;