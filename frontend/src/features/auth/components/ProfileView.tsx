import type { ProfileModel } from '../hooks/useProfile';

import { Button, Field, Feedback } from '../../../shared/ui';

import { AccountActions } from './AccountActions';
export function ProfileView(model:ProfileModel){
  const {inspectLocal,withAccountLock,user,navigate,displayName,setDisplayName,message,error,busy,save}=model;
if (!user) return null;
return <main><h1>Hồ sơ tài khoản</h1><p className="muted">{user.email}</p>
    <form className="panel" onSubmit={event => { void save(event); }} aria-busy={busy}>
      <Field label="Tên hiển thị" value={displayName} onChange={event => setDisplayName(event.target.value)} disabled={busy} hint="Để trống để xóa tên hiển thị." />
      <Button disabled={busy}>Lưu hồ sơ</Button>
    </form>
    {message && <Feedback>{message}</Feedback>}{error && <Feedback error>{error}</Feedback>}
    <section><h2>Phiên và tài khoản</h2>
      <AccountActions inspectLocal={inspectLocal} withAccountLock={withAccountLock} disabled={busy} onComplete={async (_action, notice) => {
        await navigate('/login', { replace: true, state: { notice } });
      }}/>
    </section>
  </main>;
}