import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from './content.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContentEntity])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
