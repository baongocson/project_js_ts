import { StrictMode, type PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';

export function AppProviders({ children }: PropsWithChildren) {
  return <StrictMode><BrowserRouter>{children}</BrowserRouter></StrictMode>;
}
