import { Module } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { OpenAiService } from '../common/openai.service';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';

@Module({
  providers: [SupabaseService, OpenAiService, MediaRepository, MediaService],
  exports: [MediaRepository, MediaService],
})
export class MediaModule {}
