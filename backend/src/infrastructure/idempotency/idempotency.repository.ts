import { Injectable,Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection,Types,type ClientSession } from 'mongoose';
import { Be2Repository } from '../database/be2-repository';
export interface Receipt { _id: Types.ObjectId; userId: Types.ObjectId; projectId: Types.ObjectId | null; actionScope: string; keyDigest: string; requestHash: string; status: 'pending' | 'succeeded' | 'failed'; response: { statusCode: number; body?: unknown } | null; leaseUntil: Date | null; leaseToken: string | null; createdAt: Date; updatedAt: Date }

@Injectable()
export class IdempotencyRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?:Connection){super(connection);}
  private records(){return this.db().collection<Receipt>('idempotencyRecords');}
  findClaim(filter:Pick<Receipt,'userId'|'actionScope'|'keyDigest'>,session:ClientSession){return this.records().findOne(filter,{session});}
  get(id:Types.ObjectId){return this.records().findOne({_id:id});}
  reclaim(prior:Receipt,token:string,now:Date,leaseMs:number,session:ClientSession){
    return this.records().updateOne({_id:prior._id,status:prior.status,leaseToken:prior.leaseToken,leaseUntil:prior.leaseUntil},{$set:{status:'pending',response:null,leaseToken:token,leaseUntil:new Date(now.getTime()+leaseMs),updatedAt:now}},{session});
  }
  insert(receipt:Receipt,session:ClientSession){return this.records().insertOne(receipt,{session});}
  touch(id:Types.ObjectId,token:string,now:Date,leaseMs:number,session:ClientSession){return this.records().updateOne({_id:id,status:'pending',leaseToken:token,leaseUntil:{$gt:now}},{$set:{leaseUntil:new Date(now.getTime()+leaseMs),updatedAt:now}},{session});}
  complete(id:Types.ObjectId,token:string,statusCode:number,body:unknown,session:ClientSession,projectId?:string){return this.records().updateOne({_id:id,leaseToken:token,status:'pending'},{$set:{status:'succeeded',response:{statusCode,body},leaseUntil:null,leaseToken:null,...(projectId?{projectId:new Types.ObjectId(projectId)}:{}),updatedAt:new Date()}},{session});}
  fail(id:Types.ObjectId,token:string,statusCode:number,body:unknown,session:ClientSession){return this.records().updateOne({_id:id,status:'pending',leaseToken:token},{$set:{status:'failed',response:{statusCode,body},leaseUntil:null,leaseToken:null,updatedAt:new Date()}},{session});}
}
