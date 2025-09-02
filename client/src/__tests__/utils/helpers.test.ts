import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HelperUtils } from '@/utils/helpers';

// Mock Date for consistent testing
const mockDate = new Date('2023-01-02T12:00:00Z');

describe('HelperUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatRelativeTime', () => {
    it('formats time as "just now" for recent timestamps', () => {
      const recentTime = new Date(mockDate.getTime() - 30000).toISOString(); // 30 seconds ago
      expect(HelperUtils.formatRelativeTime(recentTime)).toBe('just now');
    });

    it('formats time in minutes for timestamps within an hour', () => {
      const minutesAgo = new Date(mockDate.getTime() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
      expect(HelperUtils.formatRelativeTime(minutesAgo)).toBe('5 minutes ago');
    });

    it('formats time in hours for timestamps within a day', () => {
      const hoursAgo = new Date(mockDate.getTime() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago
      expect(HelperUtils.formatRelativeTime(hoursAgo)).toBe('3 hours ago');
    });

    it('formats time in days for timestamps within a week', () => {
      const daysAgo = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
      expect(HelperUtils.formatRelativeTime(daysAgo)).toBe('2 days ago');
    });

    it('formats absolute date for older timestamps', () => {
      const weeksAgo = new Date(mockDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      const result = HelperUtils.formatRelativeTime(weeksAgo);
      expect(result).toMatch(/Dec \d{1,2}, 2022/); // Should show absolute date
    });

    it('handles singular forms correctly', () => {
      const oneMinuteAgo = new Date(mockDate.getTime() - 60 * 1000).toISOString();
      expect(HelperUtils.formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

      const oneHourAgo = new Date(mockDate.getTime() - 60 * 60 * 1000).toISOString();
      expect(HelperUtils.formatRelativeTime(oneHourAgo)).toBe('1 hour ago');

      const oneDayAgo = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
      expect(HelperUtils.formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });
  });

  describe('formatMessageTime', () => {
    it('formats message time in HH:MM format', () => {
      const timestamp = '2023-01-02T14:30:00Z';
      const result = HelperUtils.formatMessageTime(timestamp);
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Should match time format
    });

    it('handles different timezones', () => {
      const timestamp = '2023-01-02T00:00:00Z';
      const result = HelperUtils.formatMessageTime(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatDate', () => {
    it('formats date in readable format', () => {
      const dateString = '2023-01-02T12:00:00Z';
      const result = HelperUtils.formatDate(dateString);
      expect(result).toMatch(/Jan \d{1,2}, 2023/);
    });

    it('handles different date formats', () => {
      const dateString = '2023-12-25';
      const result = HelperUtils.formatDate(dateString);
      expect(result).toMatch(/Dec \d{1,2}, 2023/);
    });
  });

  describe('isToday', () => {
    it('returns true for today\'s date', () => {
      const todayString = mockDate.toDateString();
      expect(HelperUtils.isToday(todayString)).toBe(true);
    });

    it('returns false for yesterday\'s date', () => {
      const yesterday = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000);
      expect(HelperUtils.isToday(yesterday.toDateString())).toBe(false);
    });

    it('returns false for tomorrow\'s date', () => {
      const tomorrow = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000);
      expect(HelperUtils.isToday(tomorrow.toDateString())).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('returns true for yesterday\'s date', () => {
      const yesterday = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000);
      expect(HelperUtils.isYesterday(yesterday.toDateString())).toBe(true);
    });

    it('returns false for today\'s date', () => {
      const todayString = mockDate.toDateString();
      expect(HelperUtils.isYesterday(todayString)).toBe(false);
    });

    it('returns false for two days ago', () => {
      const twoDaysAgo = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(HelperUtils.isYesterday(twoDaysAgo.toDateString())).toBe(false);
    });
  });

  describe('getUserStatusText', () => {
    it('returns correct text for online status', () => {
      expect(HelperUtils.getUserStatusText('ONLINE')).toBe('Online');
    });

    it('returns correct text for away status', () => {
      expect(HelperUtils.getUserStatusText('AWAY')).toBe('Away');
    });

    it('returns correct text for offline status', () => {
      expect(HelperUtils.getUserStatusText('OFFLINE')).toBe('Offline');
    });

    it('handles unknown status gracefully', () => {
      expect(HelperUtils.getUserStatusText('UNKNOWN' as any)).toBe('Unknown');
    });
  });

  describe('isScrolledToBottom', () => {
    it('returns true when scrolled to bottom', () => {
      const mockElement = {
        scrollTop: 100,
        scrollHeight: 200,
        clientHeight: 100
      } as HTMLElement;

      expect(HelperUtils.isScrolledToBottom(mockElement, 0)).toBe(true);
    });

    it('returns true when within threshold', () => {
      const mockElement = {
        scrollTop: 90,
        scrollHeight: 200,
        clientHeight: 100
      } as HTMLElement;

      expect(HelperUtils.isScrolledToBottom(mockElement, 20)).toBe(true);
    });

    it('returns false when not scrolled to bottom', () => {
      const mockElement = {
        scrollTop: 50,
        scrollHeight: 200,
        clientHeight: 100
      } as HTMLElement;

      expect(HelperUtils.isScrolledToBottom(mockElement, 0)).toBe(false);
    });
  });

  describe('smoothScrollToBottom', () => {
    it('calls scrollTo with smooth behavior', () => {
      const mockScrollTo = vi.fn();
      const mockElement = {
        scrollTo: mockScrollTo,
        scrollHeight: 200
      } as any;

      HelperUtils.smoothScrollToBottom(mockElement);

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 200,
        behavior: 'smooth'
      });
    });

    it('handles elements without scrollTo method', () => {
      const mockElement = {
        scrollHeight: 200,
        scrollTop: 0
      } as any;

      expect(() => HelperUtils.smoothScrollToBottom(mockElement)).not.toThrow();
      expect(mockElement.scrollTop).toBe(200);
    });
  });

  describe('truncateText', () => {
    it('truncates text longer than max length', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = HelperUtils.truncateText(longText, 20);
      expect(result).toBe('This is a very long...');
      expect(result.length).toBe(23); // 20 + '...'
    });

    it('returns original text if shorter than max length', () => {
      const shortText = 'Short text';
      const result = HelperUtils.truncateText(shortText, 20);
      expect(result).toBe('Short text');
    });

    it('handles empty string', () => {
      const result = HelperUtils.truncateText('', 20);
      expect(result).toBe('');
    });

    it('uses custom suffix', () => {
      const longText = 'This is a long text';
      const result = HelperUtils.truncateText(longText, 10, ' [more]');
      expect(result).toBe('This is a [more]');
    });
  });

  describe('generateInitials', () => {
    it('generates initials from full name', () => {
      expect(HelperUtils.generateInitials('John Doe')).toBe('JD');
    });

    it('generates initial from single name', () => {
      expect(HelperUtils.generateInitials('John')).toBe('J');
    });

    it('handles multiple names', () => {
      expect(HelperUtils.generateInitials('John Michael Doe')).toBe('JM');
    });

    it('handles empty string', () => {
      expect(HelperUtils.generateInitials('')).toBe('?');
    });

    it('handles whitespace-only string', () => {
      expect(HelperUtils.generateInitials('   ')).toBe('?');
    });

    it('converts to uppercase', () => {
      expect(HelperUtils.generateInitials('john doe')).toBe('JD');
    });
  });

  describe('debounce', () => {
    it('delays function execution', async () => {
      const mockFn = vi.fn();
      const debouncedFn = HelperUtils.debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('cancels previous calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = HelperUtils.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('passes arguments correctly', async () => {
      const mockFn = vi.fn();
      const debouncedFn = HelperUtils.debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});