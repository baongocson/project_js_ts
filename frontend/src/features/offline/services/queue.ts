import type { OfflineQueue, OfflineCommand } from '../types.ts';

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const objectId = /^[\da-f]{24}$/i;

export function createOfflineQueue(args: {
  id: string; accountId: string; datasetId: string; engineVersion: string;
  currentServerVersionId: string; commands: OfflineCommand[];
}): OfflineQueue {
  if (!uuid.test(args.id) || !objectId.test(args.datasetId) || !objectId.test(args.currentServerVersionId) ||
    !args.accountId || !args.engineVersion || args.commands.length === 0) {
    throw new Error('OFFLINE_QUEUE_INVALID');
  }
  const used = new Set<string>();
  for (const command of args.commands) {
    if (!uuid.test(command.commandId) || !objectId.test(command.baseVersionId) || command.phase !== 'queued') throw new Error('OFFLINE_COMMAND_INVALID');
    for (const key of command.kind === 'process' ? [command.previewKey, command.applyKey] : [command.restoreKey]) {
      if (!uuid.test(key) || used.has(key)) throw new Error('OFFLINE_IDEMPOTENCY_KEY_INVALID');
      used.add(key);
    }
    if (command.kind === 'restore' && !objectId.test(command.targetVersionId)) throw new Error('OFFLINE_RESTORE_TARGET_INVALID');
  }
  return { ...args, cursor: 0, status: 'pending', updatedAt: Date.now() };
}
