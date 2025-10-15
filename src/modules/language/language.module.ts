import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from './entities/language.entity';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';

@Module({
  controllers: [LanguageController],
  providers: [LanguageService],
  imports: [TypeOrmModule.forFeature([Language])],
  exports: [LanguageService],
})
export class LanguageModule {}
