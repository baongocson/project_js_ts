import { StrictMode,useEffect, type PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SessionBootstrap } from '../features/auth';
import { SyncCoordinator } from '../features/offline';
import { AppShell } from './components/AppShell';
import { ThemeEffect } from './components/ThemeEffect';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(()=>{if(import.meta.env.PROD&&'serviceWorker'in navigator)void navigator.serviceWorker.register('/offline-worker.js').catch(()=>{/* Local mode reports cache availability; offline startup may prevent an update. */});},[]);
  return <StrictMode><BrowserRouter><SessionBootstrap/><SyncCoordinator/><ThemeEffect/><AppShell>{children}</AppShell></BrowserRouter></StrictMode>;
}
