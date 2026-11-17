/** Public offline replay contract. Credentials must never be persisted here. */
export type CommandStatus = 'queued' | 'preview-sent' | 'preview-ready' | 'apply-sent' | 'restore-sent' | 'confirmed';
export type QueueStatus = 'pending' | 'syncing' | 'retry' | 'blocked' | 'conflict' | 'synced';

export type OfflineCommand = {
  commandId: string;
  kind: 'process';
  baseVersionId: string;
  specification: Record<string, unknown>;
  previewKey: string;
  applyKey: string;
  phase: CommandStatus;
  previewId?: string;
  confirmedVersionId?: string;
} | {
  commandId: string;
  kind: 'restore';
  baseVersionId: string;
  targetVersionId: string;
  restoreKey: string;
  phase: CommandStatus;
  confirmedVersionId?: string;
};

export interface OfflineQueue {
  id: string;
  accountId: string;
  datasetId: string;
  engineVersion: string;
  currentServerVersionId: string;
  cursor: number;
  commands: OfflineCommand[];
  status: QueueStatus;
  lastError?: { code: string; message: string };
  updatedAt: number;
}

export interface QueueStore {
  load(id: string): Promise<OfflineQueue | undefined>;
  save(queue: OfflineQueue): Promise<void>;
}

export interface RemoteState {
  accountId: string;
  datasetId: string;
  currentVersionId: string;
  engineVersion: string;
  resourceAvailable: boolean;
}

export interface PreviewReceipt {
  previewId: string;
  status: 'ready' | 'invalid';
  canApply: boolean;
  baseVersionId: string;
  engineVersion: string;
}

export interface SyncAdapter {
  /** Resolves authenticated user independently of any untrusted local account field. */
  currentAccountId(): Promise<string>;
  remoteState(datasetId: string): Promise<RemoteState>;
  preview(datasetId: string, baseVersionId: string, specification: Record<string, unknown>, key: string): Promise<PreviewReceipt>;
  apply(datasetId: string, previewId: string, key: string): Promise<{ newVersionId: string }>;
  restore(datasetId: string, targetVersionId: string, expectedCurrentVersionId: string, key: string): Promise<{ newVersionId: string }>;
}

export class SyncHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?:number;
  constructor(status: number, code: string, message: string,retryAfter?:number) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'SyncHttpError';
    this.retryAfter=retryAfter;
  }
}
