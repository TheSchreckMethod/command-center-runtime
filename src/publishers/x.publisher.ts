import { Injectable } from '@nestjs/common';
import { Publisher } from './publisher.interface';

@Injectable()
export class XPublisher implements Publisher {
  async publish(post: { platform: string; title?: string; body: string }) {
    // TODO: Integrate X/Twitter API v2
    console.log(`[X] Would post: ${post.body.slice(0, 50)}`);
    return { externalId: 'x-stub', url: '' };
  }
}
