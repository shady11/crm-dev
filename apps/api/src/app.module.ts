import { Module } from '@nestjs/common';
import {ConfigModule} from "@nestjs/config";
import {PrismaModule} from "@/database/prisma.module";
import {AuthModule} from "@/modules/auth/auth.module";
import {UsersModule} from "@/modules/users/users.module";
import {LeadsModule} from "@/modules/leads/leads.module";

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env'
      }),
      PrismaModule,
      AuthModule,
      UsersModule,
      LeadsModule
  ],
})
export class AppModule {}
