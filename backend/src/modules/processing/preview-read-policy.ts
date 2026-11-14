import { GoneException,NotFoundException } from '@nestjs/common';
// Authorization must precede this state check. Applied previews remain readable until expiry/purge.
export function assertPreviewReadable(preview:{expiresAt:Date}|null,now:Date):void {
 if(!preview)throw new NotFoundException({code:'PREVIEW_NOT_FOUND',message:'Không tìm thấy preview'});
 if(preview.expiresAt.getTime()<=now.getTime())throw new GoneException({code:'PREVIEW_EXPIRED',message:'Preview đã hết hạn'});
}
