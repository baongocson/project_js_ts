import { ApiError } from '../../../shared/api';
import { PreviewRejected } from '../types';

/** One user workflow owns its keys until the server proves an attempt is terminal. */
export class ProcessingSession {
  private pending?: { payload:string; key:string };
  private attempt?: { id:string; key:string; sent:boolean };

  previewKey(payload:string) {
    if(this.pending?.payload!==payload)this.pending={payload,key:crypto.randomUUID()};
    return this.pending.key;
  }
  previewFailed(error:unknown) {
    if(error instanceof ApiError&&error.status===410)this.pending=undefined;
  }
  acceptPreview(id:string) {
    this.attempt={id,key:crypto.randomUUID(),sent:false};
  }
  resetAttempt() { this.attempt=undefined; }
  cancel() { this.pending=undefined;this.attempt=undefined; }
  beginApply() {
    if(!this.attempt)return undefined;
    this.attempt.sent=true;
    return {id:this.attempt.id,key:this.attempt.key};
  }
  applyFailed(error:unknown) {
    const terminal=error instanceof PreviewRejected||error instanceof ApiError&&error.status>=400&&error.status<500&&!['IDEMPOTENCY_PENDING','REQUEST_IN_PROGRESS'].includes(error.code);
    if(terminal&&this.attempt)this.attempt.sent=false;
    return terminal;
  }
}
