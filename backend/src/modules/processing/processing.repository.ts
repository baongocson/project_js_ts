import { Injectable } from '@nestjs/common';

/** Persistence boundary reserved for preview và apply phép xử lý; no mock CRUD. */
@Injectable()
export class ProcessingRepository {}
