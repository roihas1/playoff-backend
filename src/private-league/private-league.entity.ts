import { randomBytes } from 'crypto';
import { User } from 'src/auth/user.entity';
import { Tournament } from 'src/tournament/tournament.entity';
import { LeagueMessage } from './league-message.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class PrivateLeague {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  code: string;

  @ManyToMany(() => User, (user) => user.privateLeagues, {
    eager: false,
    nullable: true,
  })
  @JoinTable()
  users: User[];

  @ManyToOne(() => User, (user) => user.adminLeagues, {
    eager: true,
    nullable: false,
  })
  admin: User;

  @ManyToOne(() => Tournament, (t) => t.privateLeagues, { nullable: false })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @OneToMany(() => LeagueMessage, (message) => message.league, {
    eager: false,
  })
  messages: LeagueMessage[];

  @BeforeInsert()
  generateCode() {
    this.code = randomBytes(3).toString('hex').substring(0, 6).toUpperCase();
  }
}
