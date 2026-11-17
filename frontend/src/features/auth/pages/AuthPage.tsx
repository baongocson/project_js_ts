import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { Button, Field, Feedback } from '../../../shared/ui';
import { authApi } from '../api/auth-api';
import { session, useSession } from '../hooks/session';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
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
  if (current.status === 'authenticated') return <Navigate to={destination} replace />;
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
  return <main className="auth-card"><span className="eyebrow">DATA WORKSPACE</span>
    <h1>{register ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
    <p className="muted">Phân tích dữ liệu, lưu phiên bản và tiếp tục làm việc khi mất mạng.</p>
    {notice && <Feedback>{notice}</Feedback>}
    {current.status === 'offline' && <Feedback>Đang ở chế độ local. Đăng nhập cần kết nối server.</Feedback>}
    {created ? <Feedback>Tạo tài khoản thành công. <Link to="/login">Đăng nhập để tiếp tục</Link>.</Feedback> :
      <form onSubmit={event => { void submit(event); }} aria-busy={busy} noValidate>
        <Field label="Email" type="email" autoComplete="username" value={email} error={fields.email} required disabled={busy} onChange={event => setEmail(event.target.value)} />
        <Field label="Mật khẩu" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password}
          error={fields.password} hint={register ? '12–72 byte UTF-8; không tự bỏ khoảng trắng.' : undefined} required disabled={busy} onChange={event => setPassword(event.target.value)} />
        {register && <Field label="Nhập lại mật khẩu" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation}
          error={fields.confirmation} required disabled={busy} onChange={event => setConfirmation(event.target.value)} />}
        <label className="check"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} /> Hiện mật khẩu</label>
        {error && <Feedback error>{error}</Feedback>}
        <Button type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'}</Button>
      </form>}
    <p><Link to={register ? '/login' : '/register'}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</Link></p>
    <Link to="/local/projects">Làm việc trên máy</Link>
  </main>;
}
