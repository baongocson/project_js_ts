import { DynamicModule, Module, Global, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { databaseOptions } from './database.connection';
import { COLLECTION_CONTRACTS } from './collection-contracts';
import { verifyDatabase } from './database.provision';

@Injectable()
class DatabaseReadiness implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async onModuleInit() {
    await this.connection.db!.command({ ping: 1 });
    const hello = await this.connection.db!.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB must support transactions');
    await verifyDatabase(this.connection);
  }
}

@Global()
@Module({})
export class DatabaseModule {
  static register(enabled: boolean): DynamicModule {
    return { module: DatabaseModule, imports: enabled ? [MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => databaseOptions({ MONGODB_URI: config.getOrThrow<string>('MONGODB_URI'), MONGODB_DB_NAME: config.get<string>('MONGODB_DB_NAME'), MONGODB_DNS_SERVERS: config.get<string>('MONGODB_DNS_SERVERS') }),
    }), MongooseModule.forFeature(COLLECTION_CONTRACTS.map(c => ({ name: c.name, schema: c.schema, collection: c.name })))] : [], providers: enabled ? [DatabaseReadiness] : [], exports: enabled ? [MongooseModule] : [] };
  }
}
