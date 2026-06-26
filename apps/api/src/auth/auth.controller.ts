import {
  Controller, Post, Body, Query, Res, Req, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  register(@Body() body: { email: string; name: string; password: string; role?: string }) {
    return this.auth.register(body);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })  // 10 attempts / minute / IP · anti-bruteforce
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(body, { ip: req.ip, ua: req.headers["user-agent"]?.toString() });
  }

  @Post("mfa/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })  // 10 attempts / minute / IP
  async mfaVerify(
    @Body() body: { tempToken: string; code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.mfaVerify(body, { ip: req.ip, ua: req.headers["user-agent"]?.toString() });
    // Set refresh token as httpOnly cookie
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    // Devolvemos el refreshToken también en el body para habilitar el refresco
    // body-based (fiable en SPA cross-origin), además de la cookie httpOnly.
    return result;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request & { user: { sub: string; refreshToken: string } }) {
    return this.auth.refresh(req.user.sub, req.user.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { user?: { sub: string } },
    @Res({ passthrough: true }) res: Response,
    @Query("reason") reason?: string,
  ) {
    res.clearCookie("refresh_token");
    if (req.user?.sub) await this.auth.logout(req.user.sub, {
      ip: req.ip, ua: req.headers["user-agent"]?.toString(),
      reason: reason ?? "manual",
    });
    return { message: "Sesión cerrada" };
  }
}
