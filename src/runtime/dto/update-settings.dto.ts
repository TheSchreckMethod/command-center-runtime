import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean() autonomousMode?: boolean;
  @IsOptional() @IsBoolean() operatorMode?: boolean;
  @IsOptional() @IsBoolean() safeMode?: boolean;
  @IsOptional() @IsInt() @Min(1) dailyTopicTarget?: number;
  @IsOptional() @IsInt() @Min(1) dailyBriefTarget?: number;
  @IsOptional() @IsInt() @Min(1) dailyPostTarget?: number;
  @IsOptional() @IsInt() @Min(1) scheduleHorizonDays?: number;
}
