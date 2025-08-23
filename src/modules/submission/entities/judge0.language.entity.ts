import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class JudgeLanguage {
  // language supported by Judge0
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  isArchived: boolean;
}
