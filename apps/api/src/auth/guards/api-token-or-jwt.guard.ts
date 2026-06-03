import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { ApiTokensService } from "../../api-tokens/api-tokens.service";

/**
 * Guard híbrido que acepta:
 *  - Authorization: Bearer <JWT> (usuarios autenticados de la UI)
 *  - X-API-Token: <API_TOKEN> (servicios externos · Power BI, scripts)
 *
 * Setea req.user con role/scopes adecuados según el origen.
 * Útil para endpoints que deben ser consumidos por ambos contextos.
 */
@Injectable()
export class ApiTokenOrJwtGuard implements CanActivate {
  constructor(
    private apiTokens: ApiTokensService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1) Intentar con X-API-Token
    const apiToken = req.headers["x-api-token"] || req.headers["X-API-Token"];
    if (apiToken && typeof apiToken === "string") {
      const result = await this.apiTokens.validateToken(apiToken);
      if (result.valid) {
        // Synthetic user "API_AGENT" para que el resto del código tenga req.user
        req.user = {
          id: `api-token:${result.tokenId}`,
          email: `api:${result.name}@savicol`,
          name: result.name ?? "API Agent",
          role: "AI_AGENT",
          scopes: result.scopes ?? [],
          isApiToken: true,
        };
        return true;
      }
      throw new UnauthorizedException("API token inválido o expirado");
    }

    // 2) Fallback a JWT (Bearer)
    const jwtGuard = new (AuthGuard("jwt"))();
    try {
      const result = await (jwtGuard.canActivate as any)(context);
      return result;
    } catch (e) {
      throw new UnauthorizedException("Se requiere Bearer JWT o X-API-Token");
    }
  }
}
