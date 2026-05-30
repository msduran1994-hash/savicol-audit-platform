import {
  Controller, Post, Body, Res, Req, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
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
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body);
  }

  @Post("mfa/verify")
  @HttpCode(HttpStatus.OK)
  async mfaVerify(
    @Body() body: { tempToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.mfaVerify(body);
    // Set refresh token as httpOnly cookie
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    const { refreshToken: _, ...safe } = result;
    return safe;
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
  ) {
    res.clearCookie("refresh_token");
    if (req.user?.sub) await this.auth.logout(req.user.sub);
    return { message: "Sesión cerrada" };
  }
}
