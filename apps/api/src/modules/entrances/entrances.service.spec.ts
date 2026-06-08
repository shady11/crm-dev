import { Test, TestingModule } from '@nestjs/testing';
import { EntrancesService } from './entrances.service';

describe('EntrancesService', () => {
  let service: EntrancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntrancesService],
    }).compile();

    service = module.get<EntrancesService>(EntrancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
