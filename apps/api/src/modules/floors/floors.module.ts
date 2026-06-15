import { Module } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FloorsController } from './floors.controller';

@Module({
  providers: [FloorsService],
  controllers: [FloorsController]
})
export class FloorsModule {}
