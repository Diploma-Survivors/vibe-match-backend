import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProblemTopic } from '../../entities/problem-topic.entity';

@Entity({ name: 'topics' })
export class Topic {
  @PrimaryGeneratedColumn('increment', { name: 'topic_id' })
  id: number;

  @Column('varchar', { nullable: false, unique: true })
  name: string;

  @Column('varchar')
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => ProblemTopic, (problemTopic) => problemTopic.topic)
  problemTopics: ProblemTopic[];
}
