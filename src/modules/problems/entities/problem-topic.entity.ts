import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Problem } from './problem.entity';
import { Topic } from '../topics/entities/topic.entity';

@Entity({ name: 'problem_topics' })
@Index(['problem', 'topic'], { unique: true })
export class ProblemTopic {
  @PrimaryGeneratedColumn('uuid', { name: 'problem_topic_id' })
  id: string;

  @ManyToOne(() => Problem, (problem) => problem.problemTopics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @ManyToOne(() => Topic, (topic) => topic.problemTopics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;
}
