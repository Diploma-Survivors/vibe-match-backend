import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Problem } from './problem.entity';

@Entity()
export class ProblemProperties {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Problem, (problem) => problem.problemProperties)
  @JoinColumn()
  problem: Problem;

  @Column()
  score: number;

  @Column()
  timeLimit: number;

  @Column()
  memoryLimit: number;
}
