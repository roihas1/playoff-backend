import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { UserTournamentPoints } from 'src/user-tournament-points/user-tournament-points.entity';

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

  @OneToMany(() => PlayoffStage, (stage) => stage.tournament)
  playoffStages: PlayoffStage[];

  @OneToMany(() => UserTournamentPoints, (utp) => utp.tournament)
  userTournamentPoints: UserTournamentPoints[];

  @OneToMany(() => PrivateLeague, (league) => league.tournament)
  privateLeagues: PrivateLeague[];
}
