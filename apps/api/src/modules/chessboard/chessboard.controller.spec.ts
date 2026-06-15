import { Test, TestingModule } from '@nestjs/testing';
import { ChessboardController } from './chessboard.controller';

describe('ChessboardController', () => {
  let controller: ChessboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChessboardController],
    }).compile();

    controller = module.get<ChessboardController>(ChessboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
