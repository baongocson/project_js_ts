// A retry may be re-claimed only through a lease CAS after checking durable receipts/operations.
export function failedRequestAction(input:{failure:'deterministic'|'transient';rollbackConfirmed:boolean}):'replay-error'|'claim-with-cas'|'recover' {
 if(input.failure==='deterministic')return 'replay-error';
 return input.rollbackConfirmed?'claim-with-cas':'recover';
}
