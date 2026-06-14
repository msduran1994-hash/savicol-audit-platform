import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:     ["log", "error", "warn"],
    bodyParser: false,              // desactivar el parser por defecto
  });

  // Aumentar límite a 20MB para soportar PDFs adjuntos como base64
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(require("express").json({ limit: "20mb" }));
  expressApp.use(require("express").urlencoded({ limit: "20mb", extended: true }));

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());

  // CORS — allow web app origin + tunnel domains
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);                    // requests sin origin (curl, postman)
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin))     return callback(null, true);
      if (origin.endsWith(".trycloudflare.com"))            return callback(null, true);
      if (origin.endsWith(".vercel.app"))                   return callback(null, true);
      if (origin === process.env.WEB_ORIGIN)                return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global prefix
  app.setGlobalPrefix("api/v1");

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
