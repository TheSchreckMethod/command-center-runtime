export interface Publisher {
  publish(post: { platform: string; title?: string; body: string; assetUrl?: string }): Promise<{ externalId: string; url: string }>;
}
