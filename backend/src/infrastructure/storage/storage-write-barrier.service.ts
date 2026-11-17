import { Injectable } from '@nestjs/common';
/** One-process filesystem coordination; durable user/project fences remain authoritative. */
@Injectable()
export class StorageWriteBarrier {
  private readonly writes = new Map<string, Set<Promise<void>>>();
  async track<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    let finished!: () => void;
    const pending = new Promise<void>(resolve => { finished = resolve; });
    const active = this.writes.get(projectId) ?? new Set<Promise<void>>();
    this.writes.set(projectId, active); active.add(pending);
    try { return await work(); }
    finally { active.delete(pending); if (!active.size) this.writes.delete(projectId); finished(); }
  }
  /** Caller committed deleting; later tracked work must fail its DB fence. */
  async wait(projectId: string): Promise<void> { await Promise.all(this.writes.get(projectId) ?? []); }
}
