import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../../shared/api';

import { authApi } from '../api/auth-api';
import { session, useSession } from './session';

export type AuthFormProps = { mode: 'login' | 'register' };
export function useAuthForm({ mode }: { mode: 'login' | 'register' }){
  const register = mode === 'register';
  const current = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const requested=(location.state as {from?:string}|null)?.from;
  const destination=requested&&(/^\/projects(?:\/|$)/.test(requested)||requested==='/profile')?requested:'/projects';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitted.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    const bytes = new TextEncoder().encode(password).length;
    const problems: Record<string, string> = {};
    if (!/^[\x21-\x7e]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail) || normalizedEmail.length > 254) problems.email = 'Nhập email ASCII hợp lệ, tối đa 254 ký tự.';
    if (bytes < (register ? 12 : 1) || bytes > 72) problems.password = register ? 'Mật khẩu phải dài 12–72 byte UTF-8.' : 'Mật khẩu phải dài 1–72 byte UTF-8.';
    if (register && password !== confirmation) problems.confirmation = 'Mật khẩu nhập lại chưa khớp.';
    setFields(problems); setError('');
    if (Object.keys(problems).length) return;
    submitted.current = true; setBusy(true);
    try {
      if (register) {
        await authApi.register({ email: normalizedEmail, password });
        setPassword(''); setConfirmation(''); setCreated(true);
      } else {
        await session.login({ email: normalizedEmail, password });
        await navigate(destination, { replace: true });
      }
    } catch (failure) {
      if (failure instanceof ApiError) setFields(failure.fieldErrors);
      setError(failure instanceof ApiError && failure.status === 401 ? 'Email hoặc mật khẩu không đúng.'
        : failure instanceof Error ? failure.message : 'Không thể hoàn tất yêu cầu.');
    } finally { submitted.current = false; setBusy(false); }
  }

  return {register,current,notice,destination,email,setEmail,password,setPassword,confirmation,setConfirmation,visible,setVisible,busy,error,fields,created,submit};
}
export type AuthFormModel = ReturnType<typeof useAuthForm>;
