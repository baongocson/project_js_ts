import { ConflictException,NotFoundException } from '@nestjs/common';
// Call only after authentication, ownership, receipt replay and expected-current CAS checks.
export function assertRestoreTarget(target:{_id:string;datasetId:string;state:string}|null,datasetId:string,currentVersionId:string):void {
 if(!target||target.datasetId!==datasetId||target.state!=='published')throw new NotFoundException({code:'VERSION_NOT_FOUND',message:'Không tìm thấy phiên bản được phép khôi phục'});
 if(target._id===currentVersionId)throw new ConflictException({code:'NO_CHANGES_TO_RESTORE',message:'Đây đã là phiên bản hiện tại'});
}
