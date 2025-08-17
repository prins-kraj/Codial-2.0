import { UserStatus } from '@/types';
import { STATUS_COLORS } from '@/config/constants';

export class HelperUtils {
  // Format date/time
  static formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  static formatTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  static formatDateTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString();
  }

  static formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const d = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(d);
    }
  }

  // Check if date is today
  static isToday(date: string | Date): boolean {
    const today = new Date();
    const d = new Date(date);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  // Check if date is yesterday
  static isYesterday(date: string | Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const d = new Date(date);
    return (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    );
  }

  // Format message timestamp
  static formatMessageTime(date: string | Date): string {
    const d = new Date(date);
    
    if (this.isToday(d)) {
      return this.formatTime(d);
    } else if (this.isYesterday(d)) {
      return `Yesterday ${this.formatTime(d)}`;
    } else {
      return `${this.formatDate(d)} ${this.formatTime(d)}`;
    }
  }

  // Get user status color
  static getUserStatusColor(status: UserStatus): string {
    return STATUS_COLORS[status] || STATUS_COLORS.OFFLINE;
  }

  // Get user status text
  static getUserStatusText(status: UserStatus): string {
    switch (status) {
      case 'ONLINE':
        return 'Online';
      case 'AWAY':
        return 'Away';
      case 'OFFLINE':
        return 'Offline';
      default:
        return 'Unknown';
    }
  }

  // Generate unique ID
  static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Debounce function
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Copy text to clipboard
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }

  // Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Truncate text
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  }

  // Get initials from name
  static getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substr(0, 2);
  }

  // Generate avatar color based on string
  static getAvatarColor(str: string): string {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Check if user is online
  static isUserOnline(lastSeen: string | Date): boolean {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    return diffInMinutes < 5; // Consider online if active within 5 minutes
  }

  // Scroll to bottom of element
  static scrollToBottom(element: HTMLElement): void {
    element.scrollTop = element.scrollHeight;
  }

  // Smooth scroll to bottom
  static smoothScrollToBottom(element: HTMLElement): void {
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    });
  }

  // Check if element is scrolled to bottom
  static isScrolledToBottom(element: HTMLElement, threshold = 100): boolean {
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }

  // Format number with commas
  static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  // Parse JSON safely
  static parseJSON<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  // Check if string is valid JSON
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  // Get browser info
  static getBrowserInfo(): { name: string; version: string } {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      name = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari')) {
      name = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edge')) {
      name = 'Edge';
      version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return { name, version };
  }

  // Check if device is mobile
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  // Get device type
  static getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    
    if (width < 768) {
      return 'mobile';
    } else if (width < 1024) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
}