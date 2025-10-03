import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProblemTag } from '../../entities/problem-tag.entity';

@Entity({ name: 'tags' })
export class Tag {
  @PrimaryColumn('uuid', { nullable: false, name: 'tag_id' })
  @Generated('uuid')
  id: string;

  @Column('varchar', { nullable: false, unique: true })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => ProblemTag, (problemTag) => problemTag.tag)
  problemTags: ProblemTag[];
}
