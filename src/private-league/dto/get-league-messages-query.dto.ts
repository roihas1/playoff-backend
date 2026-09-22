import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'ExclusiveBeforeAfter', async: false })
class ExclusiveBeforeAfterConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const dto = args.object as GetLeagueMessagesQueryDto;
    return !(dto.before && dto.after);
  }

  defaultMessage(): string {
    return 'Only one of before or after can be provided.';
  }
}

export class GetLeagueMessagesQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? 30 : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsUUID()
  tournamentId?: string;

  @Validate(ExclusiveBeforeAfterConstraint)
  private readonly exclusiveCursorValidation = true;
}
