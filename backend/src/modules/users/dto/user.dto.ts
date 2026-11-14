export type ThemeDto = 'light' | 'dark' | 'system';
export interface UserPreferencesDto { theme: ThemeDto }
export interface PatchUserDto { displayName?: string | null; preferences?: Partial<UserPreferencesDto> }
export interface PublicUserDto {
  _id: string; email: string; displayName: string | null; preferences: UserPreferencesDto;
  createdAt: string; updatedAt: string;
}
export interface RegisterResponseDto { user: Omit<PublicUserDto, 'updatedAt'> }
export interface LoginResponseDto { accessToken: string; expiresIn: number; user: Omit<PublicUserDto, 'createdAt' | 'updatedAt'> }
export interface RefreshResponseDto { accessToken: string; expiresIn: number }
export type PatchUserResponseDto = Pick<PublicUserDto, '_id' | 'displayName' | 'preferences' | 'updatedAt'>;
export const DEFAULT_USER_PREFERENCES: Readonly<UserPreferencesDto> = { theme: 'system' };
