import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem, MessageCategory, SupportedLocale, PaginatedResponse } from '@the-message/shared';
import { ContentEntity } from './content.entity';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentEntity)
    private readonly contentRepository: Repository<ContentEntity>,
  ) {}

  async findDaily(locale: SupportedLocale = 'tr'): Promise<ContentItem | null> {
    const today = new Date().toISOString().split('T')[0];
    const item = await this.contentRepository.findOne({
      where: { date: today, isActive: true },
    });

    if (!item) {
      return this.findLatest(locale);
    }

    return this.toContentItem(item);
  }

  async findAll(
    locale: SupportedLocale = 'tr',
    category?: MessageCategory,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ContentItem>> {
    const qb = this.contentRepository
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (category) {
      qb.andWhere('c.category = :category', { category });
    }

    const [entities, total] = await qb.getManyAndCount();

    return {
      items: entities.map((e) => this.toContentItem(e)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<ContentItem> {
    const item = await this.contentRepository.findOne({ where: { id, isActive: true } });
    if (!item) throw new NotFoundException(`Content ${id} not found`);
    return this.toContentItem(item);
  }

  private async findLatest(locale: SupportedLocale): Promise<ContentItem | null> {
    const item = await this.contentRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return item ? this.toContentItem(item) : null;
  }

  private toContentItem(entity: ContentEntity): ContentItem {
    return {
      id: entity.id,
      type: entity.type,
      category: entity.category,
      recommendedTime: entity.recommendedTime,
      date: entity.date ?? new Date().toISOString().split('T')[0],
      translations: entity.translations,
      audioUrl: entity.audioUrl ?? undefined,
      imageUrl: entity.imageUrl ?? undefined,
    };
  }
}
