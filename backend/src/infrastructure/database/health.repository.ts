import { Injectable,Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthRepository {
  constructor(@Optional() @InjectConnection() private readonly connection?:Connection) {}
  async ping() {
    if(this.connection?.readyState!==1)throw new Error('Disconnected');
    await this.connection.db!.command({ping:1},{timeoutMS:3000});
  }
}
