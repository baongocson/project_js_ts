import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({})
export class DatabaseModule {
  static register(enabled: boolean): DynamicModule {
    return { module: DatabaseModule, imports: enabled ? [MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI'), autoIndex: false }),
    })] : [] };
  }
}
