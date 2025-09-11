import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'topics' })
export class Topic {
  @PrimaryColumn('uuid', { nullable: false, name: 'topic_id' })
  @Generated('uuid')
  id: string;

  @Column('varchar', { nullable: false, unique: true })
  name: string;

  @Column('varchar')
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
