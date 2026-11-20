import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { DatasetRecord } from '../../infrastructure/database/be2-records';
@Injectable()
export class ImportRecoveryRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?:Connection){super(connection);}
  importing(projectId?:string){return this.db().collection<DatasetRecord>('datasets').find({lifecycle:'importing',...(projectId?{projectId:new Types.ObjectId(projectId)}:{})});}
  receipt(id:string,projectId:Types.ObjectId,session:ClientSession){return this.db().collection('idempotencyRecords').findOne({_id:new Types.ObjectId(id),projectId},{session});}
  failReceipt(receipt:{_id:Types.ObjectId;status?:unknown;leaseToken?:unknown},session:ClientSession){return this.db().collection('idempotencyRecords').updateOne({_id:receipt._id,status:receipt.status,leaseToken:receipt.leaseToken},{$set:{status:'failed',response:null,leaseToken:null,leaseUntil:null,updatedAt:new Date()}},{session});}
  sourceReferenced(key:string){return this.db().collection('datasets').findOne({'originalFile.storageKey':key});}
  activeSourceLease(key:string){return this.db().collection('idempotencyRecords').findOne({_id:new Types.ObjectId(key.slice(0,24)),status:'pending',leaseToken:key.slice(25,-4),leaseUntil:{$gt:new Date()}});}
}
