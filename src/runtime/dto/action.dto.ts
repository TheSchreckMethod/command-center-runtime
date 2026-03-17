import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RuntimeActionDto {
  @IsUUID() workspaceId!: string;
  @IsOptional() @IsInt() @Min(1) count?: number;
  @IsOptional() @IsString() sourceNotes?: string;
}
