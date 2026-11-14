import { isEmail } from 'class-validator';
import { InputValidator } from '../../../common/validation/validation';
import type { RegisterDto, LoginDto, EmptyBodyDto } from './auth.dto';

function parseCredentials(input: unknown, registration: boolean): RegisterDto | LoginDto {
  const v = new InputValidator();
  const body = v.object(input, '', ['email', 'password']);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[\x00-\x7f]+$/.test(email) || !isEmail(email, { allow_utf8_local_part: false })) {
    v.issue('email', 'Email ASCII không hợp lệ hoặc dài quá 254 ký tự');
  }
  if (typeof body.password !== 'string') v.issue('password', 'Mật khẩu phải là chuỗi');
  else {
    const bytes = Buffer.byteLength(body.password, 'utf8');
    if (bytes < (registration ? 12 : 1) || bytes > 72) v.issue('password', registration ? 'Mật khẩu phải dài 12–72 byte UTF-8' : 'Mật khẩu phải dài 1–72 byte UTF-8');
  }
  return v.finish({ email, password: body.password } as RegisterDto);
}
export function parseRegister(input: unknown): RegisterDto { return parseCredentials(input, true); }
export function parseLogin(input: unknown): LoginDto { return parseCredentials(input, false); }
export function parseEmptyBody(input: unknown): EmptyBodyDto {
  const v = new InputValidator();
  const body = v.object(input === undefined ? {} : input, '', []);
  return v.finish(body as EmptyBodyDto);
}
