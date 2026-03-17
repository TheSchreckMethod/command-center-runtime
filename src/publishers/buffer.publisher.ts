import { Injectable } from '@nestjs/common';
import { Publisher } from './publisher.interface';

@Injectable()
export class BufferPublisher implements Publisher {
  async publish(post: { platform: string; title?: string; body: string }) {
    // TODO: Integrate Buffer API for multi-platform publishing
    console.log(`[BUFFER] Would publish to ${post.platform}: ${post.title || post.body.slice(0, 50)}`);
    return { externalId: 'buffer-stub', url: '' };
  }
}
