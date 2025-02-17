import { randomBytes } from 'crypto';
import { User } from 'src/auth/user.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
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

  @BeforeInsert()
  generateCode() {
    this.code = randomBytes(3).toString('hex').substring(0, 6).toUpperCase();
  }
}
