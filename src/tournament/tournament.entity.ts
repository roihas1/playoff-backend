import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sportType: string;

  @Column('int')
  year: number;

  @Column()
  name: string;
}
