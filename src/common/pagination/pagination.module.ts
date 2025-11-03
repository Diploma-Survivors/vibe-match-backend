// NestJS
import { Global, Module } from '@nestjs/common';

// Relative imports
import { PaginationProvider } from './providers/pagination.provider';
import { CursorPaginationService } from './services/cursor-pagination.service';

@Global()
@Module({
  providers: [PaginationProvider, CursorPaginationService],
  exports: [PaginationProvider, CursorPaginationService],
})
export class PaginationModule {}
