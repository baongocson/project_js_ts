import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { HistoryModule } from './modules/history/history.module';
import { DATABASE_ENV_FILES, databaseEnvironment } from './infrastructure/database/database.connection';
const configuration = ConfigModule.forRoot({ isGlobal: true, envFilePath: DATABASE_ENV_FILES, validate: validateEnvironment });
@Module({
  imports: [configuration, DatabaseModule.register(databaseEnvironment().DATABASE_ENABLED === 'true'), AuthModule, UsersModule, ProjectsModule, DatasetsModule, AnalysisModule, ProcessingModule, HistoryModule],
  controllers: [AppController], providers: [AppService],
})
export class AppModule {}
