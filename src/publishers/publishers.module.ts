import { Module } from '@nestjs/common';
import { BufferPublisher } from './buffer.publisher';
import { LinkedInPublisher } from './linkedin.publisher';
import { YouTubePublisher } from './youtube.publisher';
import { XPublisher } from './x.publisher';

@Module({
  providers: [BufferPublisher, LinkedInPublisher, YouTubePublisher, XPublisher],
  exports: [BufferPublisher, LinkedInPublisher, YouTubePublisher, XPublisher],
})
export class PublishersModule {}
