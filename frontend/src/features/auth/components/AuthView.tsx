import type { AuthFormModel } from '../hooks/useAuthForm';

import { Link, Navigate } from 'react-router-dom';

import { AuthScene } from './AuthScene';
import { Button, Field, Feedback } from '../../../shared/ui';

export function AuthView(model:AuthFormModel){
  const {register,current,notice,destination,email,setEmail,password,setPassword,confirmation,setConfirmation,visible,setVisible,busy,error,fields,created,submit}=model;
if (current.status === 'authenticated') return <Navigate to={destination} replace />;
return <main className="auth-layout"><div className="auth-card"><span className="eyebrow">DATA WORKSPACE</span>
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
        <Button type="submit" className="auth-submit" disabled={busy} aria-busy={busy}>{busy && <span className="auth-loading-ring" aria-hidden="true"/>}{busy ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'}</Button>
      </form>}
    <p><Link to={register ? '/login' : '/register'}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</Link></p>
    <Link to="/local/projects">Làm việc trên máy</Link>
  </div><AuthScene /></main>;
}