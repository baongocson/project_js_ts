import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { Be2Repository } from './be2-repository';
/** Internal cleanup coordinator, analogous to account cleanup. No HTTP authorization role. */
@Injectable()
export class RecoveryFenceRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?: Connection) { super(connection); }
  async activeProject(projectId: Types.ObjectId, session: ClientSession): Promise<boolean> {
    const project = await this.db().collection('projects').findOne({ _id: projectId, lifecycle: { $in: ['empty', 'ready'] } }, { session });
    if (!project) return false;
    const user = await this.db().collection('users').updateOne({ _id: project.ownerId, lifecycle: 'active' }, { $inc: { writeEpoch: 1 } }, { session });
    if (!user.matchedCount) return false;
    const result = await this.db().collection('projects').updateOne({ _id: projectId, lifecycle: project.lifecycle }, { $inc: { writeEpoch: 1 } }, { session });
    return result.matchedCount === 1;
  }
}
