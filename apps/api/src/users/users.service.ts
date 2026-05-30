import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException("Usuario no encontrado");
    return user;
  }

  async updateRole(id: string, role: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== "ADMIN") throw new ForbiddenException("Solo ADMIN puede cambiar roles");
    return this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async toggleActive(id: string, requesterRole: string) {
    if (requesterRole !== "ADMIN") throw new ForbiddenException("Solo ADMIN puede activar/desactivar usuarios");
    const user = await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !(user as any).isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }
}
