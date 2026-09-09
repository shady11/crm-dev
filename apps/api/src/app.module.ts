import {Module} from '@nestjs/common';
import {ConfigModule} from "@nestjs/config";
import {validateEnv} from "@/config/env.config";
import {APP_FILTER, APP_GUARD, APP_INTERCEPTOR} from "@nestjs/core";
import {ThrottlerGuard, ThrottlerModule} from "@nestjs/throttler";
import {AllExceptionsFilter} from "@/common/filters/all-exceptions.filter";
import {HealthModule} from "@/modules/health/health.module";
import {CompaniesModule} from "@/modules/companies/companies.module";
import {PrismaModule} from "@/database/prisma.module";
import {AuthModule} from "@/modules/auth/auth.module";
import {UsersModule} from "@/modules/users/users.module";
import {BranchesModule} from "@/modules/branches/branches.module";
import {LeadsModule} from "@/modules/leads/leads.module";
import {ClientsModule} from '@/modules/clients/clients.module';
import {ProjectsModule} from './modules/projects/projects.module';
import {BlocksModule} from './modules/blocks/blocks.module';
import {EntrancesModule} from './modules/entrances/entrances.module';
import {FloorsModule} from './modules/floors/floors.module';
import {UnitsModule} from './modules/units/units.module';
import {ChessboardModule} from './modules/chessboard/chessboard.module';
import {ReferencesModule} from './modules/references/references.module';
import {SettingOptionsModule} from '@/modules/setting-options/setting-options.module';
import {DealsModule} from "@/modules/deals/deals.module";
import {TasksModule} from "@/modules/tasks/tasks.module";
import {DocumentsModule} from "@/modules/documents/documents.module";
import {ScheduleModule} from "@nestjs/schedule";
import {NotificationsModule} from "@/modules/notifications/notifications.module";
import {DashboardModule} from "@/modules/dashboard/dashboard.module";
import {AuditLogModule} from "@/modules/audit-log/audit-log.module";
import {ActivitiesModule} from "@/modules/activities/activities.module";
import {ImpersonationAuditInterceptor} from "@/common/interceptors/impersonation-audit.interceptor";

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
      BranchesModule,
      LeadsModule,
      ClientsModule,
      ProjectsModule,
      BlocksModule,
      EntrancesModule,
      FloorsModule,
      UnitsModule,
      ChessboardModule,
      ReferencesModule,
      SettingOptionsModule,
      DealsModule,
      TasksModule,
      DocumentsModule,
      NotificationsModule,
      DashboardModule,
      // Company-wide activity feed: COMPANY_ADMIN sees the whole company,
      // branch-scoped roles see only their own branch (see ActivitiesService).
      ActivitiesModule,
      // Registered so /api/health exists at all — it was written but never
      // imported, so the endpoint returned 404 and nothing could monitor it.
      HealthModule,
      // Tenant administration. Unlike every other feature module this one is
      // not company-scoped — see companies.controller.ts.
      CompaniesModule,
      // Platform-wide, append-only audit trail for SUPER_ADMIN actions.
      AuditLogModule,
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
      {
          provide: APP_INTERCEPTOR,
          useClass: ImpersonationAuditInterceptor,
      },
  ],
})
export class AppModule {}
