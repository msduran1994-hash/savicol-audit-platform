import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(config: ConfigService) {
    super({
      // Acepta el refresh token desde el body de la petición O desde la cookie
      // httpOnly. El BODY tiene prioridad: es el token que la SPA rota y persiste en
      // cada refresco (camino fiable cross-origin Vercel ↔ Railway). La cookie es un
      // respaldo: se fija una sola vez en el login MFA y NO se rota, por lo que si se
      // prioriza queda obsoleta tras el primer refresco y rompe la sesión (~30 min).
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          req?.body && typeof (req.body as any).refreshToken === "string"
            ? (req.body as any).refreshToken
            : null,
        (req: Request) => req?.cookies?.["refresh_token"] ?? null,
      ]),
      secretOrKey: config.get<string>("JWT_REFRESH_SECRET"),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string }) {
    // Mismo orden que la extracción: el body (rotado por la SPA) manda sobre la cookie.
    const bodyToken =
      typeof (req.body as any)?.refreshToken === "string" ? (req.body as any).refreshToken : null;
    const refreshToken = bodyToken ?? req.cookies?.["refresh_token"];
    return { sub: payload.sub, refreshToken };
  }
}
