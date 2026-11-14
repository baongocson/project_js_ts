export interface HistoryQueryDto {page:number;limit:number;kind?:'import'|'process'|'restore'}
export interface RestoreVersionDto {expectedCurrentVersionId:string}
