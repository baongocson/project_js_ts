import { ServiceUnavailableException } from '@nestjs/common';
import { Connection, type ClientSession } from 'mongoose';
/** Shared connection/transaction plumbing. Business collections remain in their owning repository. */
export class Be2Repository {
  constructor(protected readonly connection?: Connection) {}
  protected db() {
    if (!this.connection?.db) throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Cơ sở dữ liệu chưa sẵn sàng' });
    return this.connection.db;
  }
  async transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    this.db();
    const session = await this.connection!.startSession();
    try { return (await session.withTransaction(() => work(session)))!; }
    finally { await session.endSession(); }
  }
}
