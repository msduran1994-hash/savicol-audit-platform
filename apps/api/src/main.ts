import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn"],
  });

  // Aumentar límite del body a 25MB para soportar PDFs adjuntos como base64
  app.use(json({ limit: "25mb" }));
  app.use(urlencoded({ limit: "25mb", extended: true }));

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());

  // CORS — allow web app origin + tunnel domains
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      if (origin.endsWith(".trycloudflare.com")) return callback(null, true);
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      if (origin === process.env.WEB_ORIGIN) return callback(null, true);
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

  // Railway/Docker: usar PORT inyectado por la plataforma y escuchar en 0.0.0.0
  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`API running on port ${port}`);
}

bootstrap();
