import { Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { JudgeLanguage } from './judge0.language.entity';

@Entity()
export class Language {
  @PrimaryColumn()
  id: number; // matches Judge0 language ID

  @OneToOne(() => JudgeLanguage, (judgeLanguage) => judgeLanguage.id)
  judgeLanguage: JudgeLanguage;
}
