import { Module } from '@nestjs/common';
import { EntrancesService } from './entrances.service';
import { EntrancesController } from './entrances.controller';

@Module({
  providers: [EntrancesService],
  controllers: [EntrancesController]
})
export class EntrancesModule {}
