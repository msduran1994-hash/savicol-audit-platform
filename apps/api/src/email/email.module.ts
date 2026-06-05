import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service";

@Global() // disponible en todo módulo sin re-importar
@Module({
  providers: [EmailService],
  exports:   [EmailService],
})
export class EmailModule {}
