import { Injectable } from '@nestjs/common';

/** Persistence boundary reserved for lịch sử và khôi phục phiên bản; no mock CRUD. */
@Injectable()
export class HistoryRepository {}
