import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { Be2Repository } from '../../../infrastructure/database/be2-repository';
export interface Project { _id: Types.ObjectId; ownerId: Types.ObjectId; lifecycle: string; writeEpoch: number }
export interface Dataset { _id: Types.ObjectId; projectId: Types.ObjectId }
export interface Version { _id: Types.ObjectId; datasetId: Types.ObjectId; state: string }
export interface Preview { _id: Types.ObjectId; datasetId: Types.ObjectId }

@Injectable()
export class OwnershipRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?:Connection){super(connection);}
  project(id:Types.ObjectId){return this.db().collection<Project>('projects').findOne({_id:id});}
  dataset(id:Types.ObjectId){return this.db().collection<Dataset>('datasets').findOne({_id:id});}
  version(datasetId:Types.ObjectId,id:Types.ObjectId){return this.db().collection<Version>('datasetVersions').findOne({_id:id,datasetId,state:'published'});}
  preview(datasetId:Types.ObjectId,id:Types.ObjectId){return this.db().collection<Preview>('processingPreviews').findOne({_id:id,datasetId});}
  fenceUser(id:Types.ObjectId,session:ClientSession){return this.db().collection('users').updateOne({_id:id,lifecycle:'active'},{$inc:{writeEpoch:1}},{session});}
  fenceProject(id:Types.ObjectId,userId:Types.ObjectId,session:ClientSession){return this.db().collection('projects').updateOne({_id:id,ownerId:userId,lifecycle:{$in:['empty','ready']}},{$inc:{writeEpoch:1}},{session});}
  activeSession(id:Types.ObjectId,userId:Types.ObjectId,session:ClientSession){return this.db().collection('authSessions').findOne({_id:id,userId,revokedAt:null,expiresAt:{$gt:new Date()}},{session});}
  touchSession(id:Types.ObjectId,userId:Types.ObjectId,expiresAfter:Date,lastUsedAt:Date,session:ClientSession){return this.db().collection('authSessions').updateOne({_id:id,userId,revokedAt:null,expiresAt:{$gt:expiresAfter}},{$set:{lastUsedAt}},{session});}
}
