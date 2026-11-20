import { Injectable,Optional,UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection,Types } from 'mongoose';
import { Be2Repository } from './be2-repository';
import type { Principal } from '../../modules/auth/security/auth-context';
@Injectable()
export class AccountCleanupRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?:Connection){super(connection);}
  async markUserDeleting(userId: Types.ObjectId, principal?: Principal): Promise<void> {
    await this.transaction(async session => {
        if (principal) {
          const auth = await this.db().collection('authSessions').updateOne(
            { _id: new Types.ObjectId(principal.sessionId), userId, revokedAt: null, expiresAt: { $gt: new Date() } },
            { $set: { lastUsedAt: new Date() } }, { session },
          );
          if (!auth.matchedCount) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ' });
        }
        await this.db().collection('users').updateOne({ _id: userId, lifecycle: 'active' }, { $set: { lifecycle: 'deleting', updatedAt: new Date() }, $inc: { writeEpoch: 1 } }, { session });
        await this.db().collection('authSessions').updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
        await this.db().collection('projects').updateMany({ ownerId: userId, lifecycle: { $ne: 'deleting' } }, { $set: { lifecycle: 'deleting' }, $inc: { writeEpoch: 1 } }, { session });
    });
  }

  deletingUser(id:Types.ObjectId){return this.db().collection('users').findOne({_id:id,lifecycle:'deleting'});}
  userProjects(ownerId:Types.ObjectId){return this.db().collection('projects').find({ownerId},{projection:{_id:1}});}
  async removeUserRecords(userId:Types.ObjectId){
    await this.db().collection('idempotencyRecords').deleteMany({userId});
    await this.db().collection('authSessions').deleteMany({userId});
    await this.db().collection('users').deleteOne({_id:userId,lifecycle:'deleting'});
  }
  project(id:Types.ObjectId){return this.db().collection('projects').findOne({_id:id});}
  datasets(projectId:Types.ObjectId){return this.db().collection('datasets').find({projectId});}
  async removeDatasetContents(datasetId:Types.ObjectId){
    for await(const preview of this.db().collection('processingPreviews').find({datasetId},{projection:{_id:1}})){
      await this.db().collection('previewChanges').deleteMany({previewId:preview._id});
    }
    await this.db().collection('processingPreviews').deleteMany({datasetId});
    for await(const version of this.db().collection('datasetVersions').find({datasetId},{projection:{_id:1}})){
      await this.db().collection('dataChunks').deleteMany({versionId:version._id});
      await this.db().collection('versionColumns').deleteMany({versionId:version._id});
    }
    await this.db().collection('datasetVersions').deleteMany({datasetId});
    await this.db().collection('processingOperations').deleteMany({datasetId});
  }
  removeDataset(id:Types.ObjectId){return this.db().collection('datasets').deleteOne({_id:id});}
  async removeProjectRecords(projectId:Types.ObjectId){
    await this.db().collection('workspaces').deleteMany({projectId});
    await this.db().collection('idempotencyRecords').deleteMany({projectId});
    await this.db().collection('projects').deleteOne({_id:projectId,lifecycle:'deleting'});
  }
  deletingUsers(){return this.db().collection('users').find({lifecycle:'deleting'},{projection:{_id:1}});}
}
