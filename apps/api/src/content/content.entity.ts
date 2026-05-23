import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ContentType, MessageCategory, DayTime, SupportedLocale, ContentTranslation } from '@the-message/shared';

@Entity('content')
export class ContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  type!: ContentType;

  @Column({ type: 'varchar' })
  category!: MessageCategory;

  @Column({ type: 'varchar', default: 'any' })
  recommendedTime!: DayTime;

  @Column({ type: 'date', nullable: true })
  date!: string | null;

  @Column({ type: 'jsonb' })
  translations!: Record<SupportedLocale, ContentTranslation>;

  @Column({ type: 'varchar', nullable: true })
  audioUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
