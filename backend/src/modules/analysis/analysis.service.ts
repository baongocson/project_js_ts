import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OwnershipService } from '../auth/security/ownership.service';
import type { Principal } from '../auth/security/auth-context';
import { AnalysisRepository } from './analysis.repository';
import type { SummaryQueryDto, DistributionQueryDto, CorrelationQueryDto, Points3dQueryDto, ValueCountsQueryDto } from './dto/analysis-query.dto';
import {
  analyzeSummary, analyzeDistribution, analyzeCorrelation, analyzePoints3d, analyzeValueCounts,
} from './analysis-calculations';
import type { Snapshot } from '@dashboard/data-core';

@Injectable()
export class AnalysisService {
  constructor(private readonly ownership: OwnershipService, private readonly repository: AnalysisRepository) {}
  private async load(principal: Principal, datasetId: string, versionId: string) {
    await this.ownership.dataset(datasetId, principal);
    await this.ownership.version(datasetId, versionId);
    return this.repository.load(datasetId, versionId);
  }
  private column(snapshot: Snapshot, columnId: string) {
    const column=snapshot.columns.find(item=>item.columnId===columnId);
    if(!column) throw new NotFoundException({code:'COLUMN_NOT_FOUND',message:'Không tìm thấy cột'});
    return column;
  }
  private columns(snapshot: Snapshot, ids?:string[]) {
    if(!ids)return;
    const seen=new Set<string>();
    for(const id of ids){
      if(seen.has(id))throw new BadRequestException({code:'DUPLICATE_COLUMN_ID',message:'Danh sách cột bị trùng'});
      seen.add(id);this.column(snapshot,id);
    }
  }
  async summary(principal:Principal,datasetId:string,versionId:string,query:SummaryQueryDto) {
    const {snapshot, originalByteSize}=await this.load(principal,datasetId,versionId);
    this.columns(snapshot,query.outlierColumnIds);
    return analyzeSummary(snapshot,versionId,originalByteSize,query);
  }
  async distribution(principal:Principal,datasetId:string,versionId:string,columnId:string,query:DistributionQueryDto) {
    const {snapshot}=await this.load(principal,datasetId,versionId);
    const column=this.column(snapshot,columnId);
    return analyzeDistribution(snapshot,column,query);
  }
  async correlation(principal:Principal,datasetId:string,versionId:string,query:CorrelationQueryDto) {
    const {snapshot}=await this.load(principal,datasetId,versionId);
    return analyzeCorrelation(snapshot,query);
  }
  async points3d(principal:Principal,datasetId:string,versionId:string,query:Points3dQueryDto) {
    const {snapshot}=await this.load(principal,datasetId,versionId);
    for(const id of [query.xColumnId,query.yColumnId,query.zColumnId]) {
      if(this.column(snapshot,id).logicalType!=='number')throw new BadRequestException({code:'INVALID_AXIS_TYPE',message:'Trục 3D phải là cột số'});
    }
    this.columns(snapshot,query.outlierColumnIds);
    return analyzePoints3d(snapshot,query);
  }
  async valueCounts(principal:Principal,datasetId:string,versionId:string,columnId:string,query:ValueCountsQueryDto) {
    const {snapshot}=await this.load(principal,datasetId,versionId);
    this.column(snapshot,columnId);
    return analyzeValueCounts(snapshot,columnId,query);
  }
}
