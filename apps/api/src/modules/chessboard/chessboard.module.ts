import { Module } from '@nestjs/common';
import { ChessboardService } from './chessboard.service';
import { ChessboardController } from './chessboard.controller';

@Module({
  providers: [ChessboardService],
  controllers: [ChessboardController]
})
export class ChessboardModule {}
