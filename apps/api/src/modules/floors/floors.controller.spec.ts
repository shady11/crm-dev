import { Test, TestingModule } from '@nestjs/testing';
import { FloorsController } from './floors.controller';

describe('FloorsController', () => {
  let controller: FloorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FloorsController],
    }).compile();

    controller = module.get<FloorsController>(FloorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
