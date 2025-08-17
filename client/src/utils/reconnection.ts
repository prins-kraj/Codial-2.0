import { socketManager } from './socket';
import { UI_CONSTANTS } from '@/config/constants';

export class ReconnectionManager {
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = UI_CONSTANTS.MAX_RECONNECT_ATTEMPTS;
  private static reconnectDelay = UI_CONSTANTS.RECONNECT_DELAY;
  private static isReconnecting = false;

  static async attemptReconnection(): Promise<boolean> {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await socketManager.connect();
          this.reset();
          this.isReconnecting = false;
          resolve(true);
        } catch (error) {
          console.error('Reconnection failed:', error);
          this.isReconnecting = false;
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Try again
            const success = await this.attemptReconnection();
            resolve(success);
          } else {
            resolve(false);
          }
        }
      }, delay);
    });
  }

  static reset(): void {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
  }

  static getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  static isAttemptingReconnection(): boolean {
    return this.isReconnecting;
  }
}