export type Theme = 'light' | 'dark' | 'system';
export interface User {
  _id: string; email: string; displayName: string | null; preferences: { theme: Theme };
  createdAt?: string; updatedAt?: string;
}
export interface SessionState {
  status: 'loading' | 'authenticated' | 'anonymous' | 'offline' | 'error';
  user: User | null; message?: string;
}
export interface Credentials { email: string; password: string }
export interface TokenResponse { accessToken: string; expiresIn: number }
