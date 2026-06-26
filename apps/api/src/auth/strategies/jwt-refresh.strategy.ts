import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(config: ConfigService) {
    super({
      // Acepta el refresh token desde la cookie httpOnly O desde el body de la
      // petición. El body es el camino fiable para SPA cross-origin (Vercel ↔
      // Railway), donde las cookies cross-site son frágiles (SameSite / bloqueo
      // de cookies de terceros). Mantiene la cookie por compatibilidad.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.["refresh_token"] ?? null,
        (req: Request) =>
          req?.body && typeof (req.body as any).refreshToken === "string"
            ? (req.body as any).refreshToken
            : null,
      ]),
      secretOrKey: config.get<string>("JWT_REFRESH_SECRET"),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string }) {
    const refreshToken =
      req.cookies?.["refresh_token"] ?? (req.body as any)?.refreshToken;
    return { sub: payload.sub, refreshToken };
  }
}
