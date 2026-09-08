import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { UnitsImportService } from './units-import.service';
import { UnitsController } from './units.controller';

@Module({
  providers: [UnitsService, UnitsImportService],
  controllers: [UnitsController]
})
export class UnitsModule {}
