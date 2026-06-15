import { Module } from '@nestjs/common';
import {ConfigModule} from "@nestjs/config";
import {PrismaModule} from "@/database/prisma.module";
import {AuthModule} from "@/modules/auth/auth.module";
import {UsersModule} from "@/modules/users/users.module";
import {LeadsModule} from "@/modules/leads/leads.module";
import { ClientsModule } from '@/modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { EntrancesModule } from './modules/entrances/entrances.module';
import { FloorsModule } from './modules/floors/floors.module';
import { UnitsModule } from './modules/units/units.module';
import { ChessboardModule } from './modules/chessboard/chessboard.module';
import { ReferencesModule } from './modules/references/references.module';

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env'
      }),
      PrismaModule,
      AuthModule,
      UsersModule,
      LeadsModule,
      ClientsModule,
      ProjectsModule,
      BlocksModule,
      EntrancesModule,
      FloorsModule,
      UnitsModule,
      ChessboardModule,
      ReferencesModule
  ],
})
export class AppModule {}
