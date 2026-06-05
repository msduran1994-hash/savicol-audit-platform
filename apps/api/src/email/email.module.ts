import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { EmailController } from "./email.controller";

@Global() // disponible en todo módulo sin re-importar
@Module({
  providers: [EmailService],
  controllers: [EmailController],
  exports:   [EmailService],
})
export class EmailModule {}
