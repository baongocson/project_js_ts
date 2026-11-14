import { BadRequestException } from '@nestjs/common';
import { InputValidator } from '../../../common/validation/validation';
import type { PatchUserDto } from './user.dto';
export function parsePatchUser(input: unknown): PatchUserDto {
  const v = new InputValidator();
  const body = v.object(input, '', ['displayName', 'preferences']);
  const result: PatchUserDto = {};
  if (Object.hasOwn(body, 'displayName')) {
    if (body.displayName === null) result.displayName = null;
    else if (typeof body.displayName !== 'string') v.issue('displayName', 'Tên phải là chuỗi hoặc null');
    else {
      result.displayName = body.displayName.trim();
      if (Array.from(result.displayName).length < 1 || Array.from(result.displayName).length > 100) v.issue('displayName', 'Tên phải dài 1–100 ký tự Unicode sau trim');
    }
  }
  if (Object.hasOwn(body, 'preferences')) {
    const preferences = v.object(body.preferences, 'preferences', ['theme']);
    if (Object.hasOwn(preferences, 'theme')) {
      v.enumeration(preferences.theme, 'preferences.theme', ['light', 'dark', 'system']);
      result.preferences = { theme: preferences.theme as 'light' | 'dark' | 'system' };
    }
  }
  v.finish(result);
  if (!Object.keys(result).length) throw new BadRequestException({ code: 'EMPTY_PATCH', message: 'Không có trường hồ sơ để cập nhật' });
  return result;
}
