import { SyncHttpError, type SyncAdapter, type PreviewReceipt, type RemoteState } from '../types.ts';

export interface OfflineApiConfig {
  baseUrl: string;
  /** Returns a short-lived access token at request time. Never persist in outbox. */
  accessToken(): Promise<string>;
  accountId(): Promise<string>;
  /** Fetch server head + engine version with authenticated API reads. */
  readRemoteState(datasetId: string): Promise<RemoteState>;
}

export class OfflineApiAdapter implements SyncAdapter {
  private readonly config: OfflineApiConfig;
  constructor(config: OfflineApiConfig) { this.config = config; }

  currentAccountId(): Promise<string> { return this.config.accountId(); }
  remoteState(datasetId: string): Promise<RemoteState> { return this.config.readRemoteState(datasetId); }

  private async post(path: string, body: Record<string, unknown>, key: string): Promise<Record<string, unknown>> {
    const token = await this.config.accessToken();
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Idempotency-Key': key },
      body: JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const envelope = isRecord(data) && isRecord(data.error) ? data.error : data;
      const code = isRecord(envelope) && typeof envelope.code === 'string' ? envelope.code : `HTTP_${response.status}`;
      throw new SyncHttpError(response.status, code, `API ${response.status}: ${code}`);
    }
    if (!isRecord(data)) throw new Error('INVALID_SERVER_RECEIPT');
    return data;
  }

  async preview(datasetId: string, baseVersionId: string, specification: Record<string, unknown>, key: string): Promise<PreviewReceipt> {
    const data = await this.post(`datasets/${datasetId}/previews`, { baseVersionId, specification }, key);
    if (typeof data.previewId !== 'string' || typeof data.baseVersionId !== 'string' || typeof data.engineVersion !== 'string' || (data.status !== 'ready' && data.status !== 'invalid')) {
      throw new Error('INVALID_PREVIEW_RECEIPT');
    }
    return { previewId: data.previewId, baseVersionId: data.baseVersionId, engineVersion: data.engineVersion, status: data.status, canApply: data.canApply === true };
  }

  async apply(datasetId: string, previewId: string, key: string): Promise<{newVersionId: string}> {
    const data = await this.post(`datasets/${datasetId}/operations`, { previewId }, key);
    if (!isRecord(data.dataset) || typeof data.dataset.currentVersionId !== 'string') throw new Error('INVALID_APPLY_RECEIPT');
    return { newVersionId: data.dataset.currentVersionId };
  }

  async restore(datasetId: string, targetVersionId: string, expectedCurrentVersionId: string, key: string): Promise<{newVersionId: string}> {
    const data = await this.post(`datasets/${datasetId}/versions/${targetVersionId}/restore`, { expectedCurrentVersionId }, key);
    if (!isRecord(data.newVersion) || typeof data.newVersion._id !== 'string') throw new Error('INVALID_RESTORE_RECEIPT');
    return { newVersionId: data.newVersion._id };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
