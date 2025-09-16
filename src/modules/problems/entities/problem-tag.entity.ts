import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tag } from '../tags/entities/tag.entity';
import { Problem } from './problem.entity';

@Entity({ name: 'problem_tags' })
@Index(['problem', 'tag'], { unique: true })
export class ProblemTag {
  @PrimaryGeneratedColumn('uuid', { name: 'problem_tag_id' })
  id: string;

  @ManyToOne(() => Problem, (problem) => problem.problemTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @ManyToOne(() => Tag, (tag) => tag.problemTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
