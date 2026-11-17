import { createContext, useContext } from 'react';

export const WorkspacePreviewContext = createContext<HTMLElement | null>(null);
/** Features own preview semantics; the shared layout only provides its display location. */
export function useWorkspacePreviewHost() { return useContext(WorkspacePreviewContext); }
