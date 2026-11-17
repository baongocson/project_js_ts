import type { OfflineQueue, QueueStore, SyncAdapter, OfflineCommand } from './types.ts';
import { SyncHttpError as HttpError } from './types.ts';

export interface ReplayResult { status: OfflineQueue['status']; cursor: number; error?: string }

async function checkpoint(store: QueueStore, queue: OfflineQueue): Promise<void> {
  queue.updatedAt = Date.now();
  await store.save(queue);
}

function confirmVersion(reply: string): string {
  if (!/^[\da-f]{24}$/i.test(reply)) throw new Error('SYNC_INVALID_VERSION_RECEIPT');
  return reply.toLowerCase();
}

function errorKind(error: unknown): { status: OfflineQueue['status']; code: string; message: string } {
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 413) {
      return { status: 'blocked', code: error.code, message: error.message };
    }
    if (error.status === 409 && !['REQUEST_IN_PROGRESS', 'IDEMPOTENCY_PENDING', 'LEASE_BUSY'].includes(error.code)) {
      return { status: 'conflict', code: error.code, message: error.message };
    }
    return { status: 'retry', code: error.code, message: error.message };
  }
  return { status: 'retry', code: 'NETWORK_OR_UNKNOWN_COMMIT', message: 'Không xác nhận được server commit; giữ key để retry' };
}

async function checkOwner(queue: OfflineQueue, adapter: SyncAdapter): Promise<void> {
  const accountId = await adapter.currentAccountId();
  if (accountId !== queue.accountId) throw new HttpError(403, 'SYNC_ACCOUNT_MISMATCH', 'Sai tài khoản đăng nhập');
}

async function checkRemote(queue: OfflineQueue, adapter: SyncAdapter, checkBase: boolean): Promise<void> {
  const remote = await adapter.remoteState(queue.datasetId);
  if (!remote.resourceAvailable || remote.datasetId !== queue.datasetId) throw new HttpError(404, 'SYNC_RESOURCE_UNAVAILABLE', 'Không còn quyền hoặc tài nguyên không tồn tại');
  if (remote.accountId !== queue.accountId) throw new HttpError(403, 'SYNC_ACCOUNT_MISMATCH', 'Không đúng chủ dữ liệu');
  if (remote.engineVersion !== queue.engineVersion) throw new HttpError(409, 'SYNC_ENGINE_MISMATCH', 'Engine khác phiên bản; cần review');
  if (checkBase && remote.currentVersionId !== queue.currentServerVersionId) {
    throw new HttpError(409, 'BASE_VERSION_STALE', 'Server thay đổi; không tự ghi đè dữ liệu offline');
  }
}

/**
 * Replays a queue bound to an existing server dataset. Unknown commit is retried
 * with exactly the persisted idempotency key. Replay never assumes a timeout
 * means rollback. Multi-version local-to-server ID mapping must happen before
 * appending commands; this function will not invent that mapping.
 */
export async function replayOfflineQueue(store: QueueStore, adapter: SyncAdapter, id: string): Promise<ReplayResult> {
  const queue = await store.load(id);
  if (!queue) throw new Error('OFFLINE_QUEUE_NOT_FOUND');
  if (queue.status === 'synced') return { status: 'synced', cursor: queue.cursor };
  try {
    await checkOwner(queue, adapter);
    queue.status = 'syncing';
    queue.lastError = undefined;
    await checkpoint(store, queue);
    while (queue.cursor < queue.commands.length) {
      const command: OfflineCommand = queue.commands[queue.cursor];
      // An unresolved commit must first replay its original receipt. A preflight
      // version check here would wrongly report stale after a successful commit.
      const commitUnconfirmed = command.phase === 'apply-sent' || command.phase === 'restore-sent';
      await checkRemote(queue, adapter, !commitUnconfirmed);
      if (command.baseVersionId !== queue.currentServerVersionId) {
        throw new HttpError(409, 'SYNC_MAPPING_REQUIRED', 'Chưa xác minh version/ID mapping cho thao tác tiếp theo');
      }
      let newVersionId: string;
      if (command.kind === 'process') {
        if (command.phase === 'queued' || command.phase === 'preview-sent') {
          command.phase = 'preview-sent';
          await checkpoint(store, queue);
          const preview = await adapter.preview(queue.datasetId, command.baseVersionId, command.specification, command.previewKey);
          if (preview.status !== 'ready' || !preview.canApply || preview.baseVersionId !== command.baseVersionId || preview.engineVersion !== queue.engineVersion) {
            throw new HttpError(409, 'SYNC_PREVIEW_MISMATCH', 'Preview server không khớp; cần review trước Apply');
          }
          if (!/^[\da-f]{24}$/i.test(preview.previewId)) throw new HttpError(409, 'SYNC_PREVIEW_INVALID', 'Preview ID không hợp lệ');
          command.previewId = preview.previewId;
          command.phase = 'preview-ready';
          await checkpoint(store, queue);
        }
        if (!command.previewId) throw new Error('SYNC_PREVIEW_NOT_CHECKPOINTED');
        if (command.phase === 'preview-ready') {
          command.phase = 'apply-sent';
          await checkpoint(store, queue);
        }
        newVersionId = confirmVersion((await adapter.apply(queue.datasetId, command.previewId, command.applyKey)).newVersionId);
      } else {
        if (command.phase === 'queued') {
          command.phase = 'restore-sent';
          await checkpoint(store, queue);
        }
        newVersionId = confirmVersion((await adapter.restore(queue.datasetId, command.targetVersionId, command.baseVersionId, command.restoreKey)).newVersionId);
      }
      // Do not mark synced if server cannot confirm the published head.
      const remote = await adapter.remoteState(queue.datasetId);
      if (!remote.resourceAvailable || remote.accountId !== queue.accountId || remote.datasetId !== queue.datasetId) {
        throw new HttpError(403, 'SYNC_OWNER_CHANGED', 'Không xác minh được quyền truy cập sau commit');
      }
      if (remote.currentVersionId !== newVersionId) throw new HttpError(409, 'SYNC_RECEIPT_HEAD_MISMATCH', 'Server head khác receipt đã xác nhận');
      command.phase = 'confirmed';
      command.confirmedVersionId = newVersionId;
      queue.currentServerVersionId = newVersionId;
      queue.cursor += 1;
      await checkpoint(store, queue);
    }
    queue.status = 'synced';
    await checkpoint(store, queue);
    return { status: 'synced', cursor: queue.cursor };
  } catch (error) {
    const issue = errorKind(error);
    queue.status = issue.status;
    queue.lastError = { code: issue.code, message: issue.message };
    await checkpoint(store, queue);
    return { status: issue.status, cursor: queue.cursor, error: issue.code };
  }
}
