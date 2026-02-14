import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import { Conference } from '../series/conference.enum';

@Entity()
export class Team {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  name: string;

  @Column({ default: '' })
  city: string;

  @Column()
  @Index()
  abbreviation: string;

  @Column({
    type: 'enum',
    enum: Conference,
  })
  conference: Conference;

  @Column({ default: true })
  isActive: boolean;
}
