import type { ProcessingSummary } from '@dashboard/data-core';
export interface Operation {_id:string;kind:'import'|'process'|'restore';baseVersionId:string|null;resultVersionId:string;summary:ProcessingSummary;createdAt:string;specification:{method?:string;targetVersionId?:string}}
export interface HistoryPage {items:Operation[];page:number;limit:number;total:number}
