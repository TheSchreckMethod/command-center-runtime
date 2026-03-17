import { Injectable } from '@nestjs/common';
import { Publisher } from './publisher.interface';

@Injectable()
export class YouTubePublisher implements Publisher {
  async publish(post: { platform: string; title?: string; body: string; assetUrl?: string }) {
    // TODO: Integrate YouTube Data API v3 via OAuth2
    console.log(`[YOUTUBE] Would upload: ${post.title}`);
    return { externalId: 'youtube-stub', url: '' };
  }
}
