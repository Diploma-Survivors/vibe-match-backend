import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Topic } from '../topics/entities/topic.entity';
import { Problem } from './problem.entity';

@Entity({ name: 'problem_topics' })
@Index(['problemId', 'topicId'], { unique: true })
export class ProblemTopic {
  @PrimaryGeneratedColumn('increment', { name: 'problem_topic_id' })
  id: number;

  @Column('int', { name: 'problem_id' })
  problemId: number;

  @ManyToOne(() => Problem, (problem) => problem.problemTopics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column('int', { name: 'topic_id' })
  topicId: number;

  @ManyToOne(() => Topic, (topic) => topic.problemTopics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;
}
