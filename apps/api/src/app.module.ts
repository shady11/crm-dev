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
      EntrancesModule
  ],
})
export class AppModule {}
