import {NestFactory} from '@nestjs/core';
import {Logger, ValidationPipe} from "@nestjs/common";
import {NestExpressApplication} from "@nestjs/platform-express";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import helmet from "helmet";
import {json, urlencoded} from "express";
import {AppModule} from '@/app.module';
import {corsOptions} from '@/config/env.config';

async function bootstrap() {
  // Required environment is validated inside AppModule (ConfigModule's
  // `validate` hook), so a missing variable fails here, before any provider
  // connects to anything.
  // Typed as the Express application so `set('trust proxy')` is available.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a reverse proxy, the client IP arrives in X-Forwarded-For. Without
  // this every request looks like it came from the proxy, and the login rate
  // limit would throttle the whole company as if it were one attacker.
  app.set("trust proxy", 1);

  app.use(helmet());

  // Document uploads have their own 20 MB limit inside multer; JSON bodies in
  // this API are small, so anything larger is either a mistake or an attempt to
  // exhaust memory.
  app.use(json({limit: "1mb"}));
  app.use(urlencoded({extended: true, limit: "1mb"}));

  app.setGlobalPrefix("api");

  app.enableCors(corsOptions());

  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
  );

  // Off unless explicitly switched on. Useful to us while building the pilot;
  // not something to expose on the client's server by default.
  if (process.env.ENABLE_API_DOCS === "true") {
    const config = new DocumentBuilder()
        .setTitle("CRM API")
        .setDescription("Real estate developer CRM")
        .setVersion("1.0")
        .addBearerAuth()
        .build();

    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));
    Logger.log("API docs enabled at /api/docs", "Bootstrap");
  }

  // Lets in-flight requests finish and Prisma disconnect cleanly when the
  // container is asked to stop, instead of the process being killed mid-write.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`API listening on port ${port}`, "Bootstrap");
}

bootstrap().catch((error) => {
  // Without this, a startup failure surfaces as an unhandled promise rejection
  // with no context — which is exactly the wrong thing to be debugging over SSH
  // on someone else's server.
  Logger.error(
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined,
      "Bootstrap",
  );
  process.exit(1);
});
