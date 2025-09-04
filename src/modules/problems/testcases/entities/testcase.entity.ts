import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'testcases' })
export class Testcase {
  @PrimaryColumn('uuid', {
    nullable: false,
    name: 'testcase_id',
  })
  @Generated('uuid')
  id: string;

  @Column('text', { nullable: false })
  fileUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
