import { Injectable } from '@nestjs/common';
import { Publisher } from './publisher.interface';

@Injectable()
export class LinkedInPublisher implements Publisher {
  async publish(post: { platform: string; title?: string; body: string }) {
    // TODO: Integrate LinkedIn API via access token
    console.log(`[LINKEDIN] Would publish: ${post.title || post.body.slice(0, 50)}`);
    return { externalId: 'linkedin-stub', url: '' };
  }
}
