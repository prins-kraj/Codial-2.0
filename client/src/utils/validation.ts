import { VALIDATION } from '@/config/constants';
import { FormErrors } from '@/types';

export class ValidationUtils {
  // Validate email format
  static validateEmail(email: string): string | null {
    if (!email) {
      return 'Email is required';
    }
    
    if (!VALIDATION.EMAIL.PATTERN.test(email)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  }

  // Validate username
  static validateUsername(username: string): string | null {
    if (!username) {
      return 'Username is required';
    }
    
    if (username.length < VALIDATION.USERNAME.MIN_LENGTH) {
      return `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters long`;
    }
    
    if (username.length > VALIDATION.USERNAME.MAX_LENGTH) {
      return `Username must be no more than ${VALIDATION.USERNAME.MAX_LENGTH} characters long`;
    }
    
    if (!VALIDATION.USERNAME.PATTERN.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    
    if (/^[_-]/.test(username) || /[_-]$/.test(username)) {
      return 'Username cannot start or end with underscore or hyphen';
    }
    
    return null;
  }

  // Validate password
  static validatePassword(password: string): string | null {
    if (!password) {
      return 'Password is required';
    }
    
    if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
      return `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters long`;
    }
    
    if (!VALIDATION.PASSWORD.PATTERN.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    
    return null;
  }

  // Validate password confirmation
  static validatePasswordConfirmation(password: string, confirmPassword: string): string | null {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    
    return null;
  }

  // Validate room name
  static validateRoomName(name: string): string | null {
    if (!name) {
      return 'Room name is required';
    }
    
    if (name.length < VALIDATION.ROOM_NAME.MIN_LENGTH) {
      return `Room name must be at least ${VALIDATION.ROOM_NAME.MIN_LENGTH} character long`;
    }
    
    if (name.length > VALIDATION.ROOM_NAME.MAX_LENGTH) {
      return `Room name must be no more than ${VALIDATION.ROOM_NAME.MAX_LENGTH} characters long`;
    }
    
    if (!VALIDATION.ROOM_NAME.PATTERN.test(name)) {
      return 'Room name can only contain letters, numbers, spaces, hyphens, underscores, and #';
    }
    
    return null;
  }

  // Validate message content
  static validateMessage(content: string): string | null {
    if (!content || content.trim().length === 0) {
      return 'Message cannot be empty';
    }
    
    if (content.length > VALIDATION.MESSAGE.MAX_LENGTH) {
      return `Message must be no more than ${VALIDATION.MESSAGE.MAX_LENGTH} characters long`;
    }
    
    return null;
  }

  // Validate login form
  static validateLoginForm(email: string, password: string): FormErrors {
    const errors: FormErrors = {};
    
    const emailError = this.validateEmail(email);
    if (emailError) errors.email = emailError;
    
    if (!password) {
      errors.password = 'Password is required';
    }
    
    return errors;
  }

  // Validate registration form
  static validateRegistrationForm(
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ): FormErrors {
    const errors: FormErrors = {};
    
    const usernameError = this.validateUsername(username);
    if (usernameError) errors.username = usernameError;
    
    const emailError = this.validateEmail(email);
    if (emailError) errors.email = emailError;
    
    const passwordError = this.validatePassword(password);
    if (passwordError) errors.password = passwordError;
    
    const confirmPasswordError = this.validatePasswordConfirmation(password, confirmPassword);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    
    return errors;
  }

  // Validate room creation form
  static validateRoomForm(name: string, description?: string): FormErrors {
    const errors: FormErrors = {};
    
    const nameError = this.validateRoomName(name);
    if (nameError) errors.name = nameError;
    
    if (description && description.length > 200) {
      errors.description = 'Description must be no more than 200 characters long';
    }
    
    return errors;
  }

  // Check if form has errors
  static hasErrors(errors: FormErrors): boolean {
    return Object.values(errors).some(error => error !== undefined && error !== '');
  }

  // Get first error message
  static getFirstError(errors: FormErrors): string | null {
    const firstError = Object.values(errors).find(error => error !== undefined && error !== '');
    return firstError || null;
  }

  // Sanitize HTML content
  static sanitizeHtml(content: string): string {
    const div = document.createElement('div');
    div.textContent = content;
    return div.innerHTML;
  }

  // Escape HTML entities
  static escapeHtml(content: string): string {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(content));
    return div.innerHTML;
  }

  // Validate file upload
  static validateFile(file: File, maxSize: number, allowedTypes: string[]): string | null {
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }
    
    return null;
  }
}