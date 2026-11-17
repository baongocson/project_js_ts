import { useEffect, useRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type PropsWithChildren } from 'react';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button {...props} className={`button ${variant} ${className}`} />;
}
export function Field({ label, error, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id || generatedId;
  return <div className="field"><label htmlFor={id}>{label}</label><input {...props} id={id}
    aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${id}-help` : undefined} />
    {(error || hint) && <small id={`${id}-help`} className={error ? 'error' : 'muted'}>{error || hint}</small>}</div>;
}
export function Feedback({ error, children }: PropsWithChildren<{ error?: boolean }>) {
  return <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>;
}
export function Dialog({ title, children, onClose, busy = false }: PropsWithChildren<{ title: string; onClose(): void; busy?: boolean }>) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    dialog?.showModal();return()=>{dialog?.close();if(previous?.isConnected)previous.focus();};
  }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={id}>{title}</h2>{children}
    <Button variant="secondary" onClick={onClose} disabled={busy}>Hủy</Button>
  </dialog>;
}
