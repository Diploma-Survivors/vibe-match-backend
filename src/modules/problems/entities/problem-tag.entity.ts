import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tag } from '../tags/entities/tag.entity';
import { Problem } from './problem.entity';

@Entity({ name: 'problem_tags' })
@Index(['problemId', 'tagId'], { unique: true })
export class ProblemTag {
  @PrimaryGeneratedColumn('increment', { name: 'problem_tag_id' })
  id: number;

  @Column('int', { name: 'problem_id' })
  problemId: number;

  @ManyToOne(() => Problem, (problem) => problem.problemTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column('int', { name: 'tag_id' })
  tagId: number;

  @ManyToOne(() => Tag, (tag) => tag.problemTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
