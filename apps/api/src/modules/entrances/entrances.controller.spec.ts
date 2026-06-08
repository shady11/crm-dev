import { Test, TestingModule } from '@nestjs/testing';
import { EntrancesController } from './entrances.controller';

describe('EntrancesController', () => {
  let controller: EntrancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntrancesController],
    }).compile();

    controller = module.get<EntrancesController>(EntrancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
