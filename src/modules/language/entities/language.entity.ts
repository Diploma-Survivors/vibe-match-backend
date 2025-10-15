import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({
  name: 'languages',
})
export class Language {
  @PrimaryColumn()
  id: number; // matches Judge0 language ID

  @Column()
  name: string;
}
