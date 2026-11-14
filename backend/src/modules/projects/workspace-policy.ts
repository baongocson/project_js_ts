import { ConflictException } from '@nestjs/common';
import { canonicalRequest } from '../../common/domain/canonical-request';
import type { PatchWorkspaceDto, WorkspaceStateDto } from './dto/workspace.dto';
export interface StoredWorkspace extends WorkspaceStateDto {revision:number;boundVersionId:string|null}
// Pure policy only. Persistence must use an atomic CAS even for a no-op read/acknowledgement.
export function planWorkspacePatch(current:StoredWorkspace,patch:PatchWorkspaceDto,currentVersionId:string|null):{changed:boolean;workspace:StoredWorkspace} {
 if(patch.revision!==current.revision)throw new ConflictException({code:'WORKSPACE_REVISION_CONFLICT',message:'Cấu hình đã được cập nhật ở nơi khác'});
 if(patch.boundVersionId!==currentVersionId)throw new ConflictException({code:'BASE_VERSION_STALE',message:'Phiên bản dữ liệu đã thay đổi'});
 const next:StoredWorkspace={...current,boundVersionId:currentVersionId,
  activeTab:patch.activeTab??current.activeTab,
  chartConfig:{...current.chartConfig,...patch.chartConfig},selection:{...current.selection,...patch.selection},tableState:{...current.tableState,...patch.tableState}};
 // No reset of method/threshold, refs or selections beyond the submitted patch.
 const changed=canonicalRequest({...next,revision:0})!==canonicalRequest({...current,revision:0});
 return {changed,workspace:changed?{...next,revision:current.revision+1}:current};
}
