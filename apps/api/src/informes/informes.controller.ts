import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { InformesService, EnviarInformeDto } from "./informes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("informes")
@UseGuards(JwtAuthGuard)
export class InformesController {
  constructor(private svc: InformesService) {}

  @Post("enviar")
  enviar(@Body() dto: EnviarInformeDto, @Req() req: AuthRequest) {
    return this.svc.enviar(dto, { name: req.user?.name, email: req.user?.email });
  }

  @Get("envios")
  envios() {
    return this.svc.listarEnvios();
  }
}
