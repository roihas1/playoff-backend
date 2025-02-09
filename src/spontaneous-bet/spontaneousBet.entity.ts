import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class SpontaneousBet extends PlayerMatchupBet {
  @Column({ default: 0 })
  gameNumber: number;

  @Column({
    type: 'timestamptz',
    nullable: false,
  })
  startTime: Date;
  @OneToMany(
    () => SpontaneousGuess,
    (spontaneousGuess) => spontaneousGuess.bet,
    {
      eager: true,
      cascade: true, // Ensures guesses are automatically inserted
    },
  )
  guesses: SpontaneousGuess[];
}
