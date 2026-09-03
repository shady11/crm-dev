import {Module} from '@nestjs/common';
import {ConfigModule} from "@nestjs/config";
import {validateEnv} from "@/config/env.config";
import {APP_FILTER, APP_GUARD} from "@nestjs/core";
import {ThrottlerGuard, ThrottlerModule} from "@nestjs/throttler";
import {AllExceptionsFilter} from "@/common/filters/all-exceptions.filter";
import {HealthModule} from "@/modules/health/health.module";
import {PrismaModule} from "@/database/prisma.module";
import {AuthModule} from "@/modules/auth/auth.module";
import {UsersModule} from "@/modules/users/users.module";
import {LeadsModule} from "@/modules/leads/leads.module";
import {ClientsModule} from '@/modules/clients/clients.module';
import {ProjectsModule} from './modules/projects/projects.module';
import {BlocksModule} from './modules/blocks/blocks.module';
import {EntrancesModule} from './modules/entrances/entrances.module';
import {FloorsModule} from './modules/floors/floors.module';
import {UnitsModule} from './modules/units/units.module';
import {ChessboardModule} from './modules/chessboard/chessboard.module';
import {ReferencesModule} from './modules/references/references.module';
import {DealsModule} from "@/modules/deals/deals.module";
import {TasksModule} from "@/modules/tasks/tasks.module";
import {DocumentsModule} from "@/modules/documents/documents.module";
import {ScheduleModule} from "@nestjs/schedule";
import {NotificationsModule} from "@/modules/notifications/notifications.module";
import {DashboardModule} from "@/modules/dashboard/dashboard.module";

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          // Fails fast on a missing variable instead of letting the app boot
          // half-configured. Runs after the .env file is loaded and before any
          // provider is constructed.
          validate: validateEnv,
      }),
      ScheduleModule.forRoot(),
      // Default ceiling for every route. Generous enough that normal CRM use
      // never touches it — the point is to stop scripted abuse, not to shape
      // traffic. The login route sets its own, far tighter limit.
      ThrottlerModule.forRoot([
          {
              name: "default",
              ttl: 60_000,
              limit: 300,
          },
      ]),
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
      ReferencesModule,
      DealsModule,
      TasksModule,
      DocumentsModule,
      NotificationsModule,
      DashboardModule,
      // Registered so /api/health exists at all — it was written but never
      // imported, so the endpoint returned 404 and nothing could monitor it.
      HealthModule,
  ],
  providers: [
      {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
      },
      {
          provide: APP_FILTER,
          useClass: AllExceptionsFilter,
      },
  ],
})
export class AppModule {}
