import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Problem } from '../../problem/entities/problem.entity';

@Entity()
export class TestCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  input: string;

  @Column('text')
  output: string;

  @ManyToOne(() => Problem, (problem) => problem.testCases)
  problem: Problem;
}
