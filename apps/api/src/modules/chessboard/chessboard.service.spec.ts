import { Test, TestingModule } from '@nestjs/testing';
import { ChessboardService } from './chessboard.service';

describe('ChessboardService', () => {
  let service: ChessboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessboardService],
    }).compile();

    service = module.get<ChessboardService>(ChessboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
