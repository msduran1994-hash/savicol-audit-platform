import { Module } from "@nestjs/common";
import { CedisController } from "./cedis.controller";
import { CedisService } from "./cedis.service";

@Module({
  controllers: [CedisController],
  providers: [CedisService],
})
export class CedisModule {}
