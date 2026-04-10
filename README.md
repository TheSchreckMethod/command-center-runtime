# Command Center Runtime v3.1

Autonomous content pipeline for The Schreck Method.
Express + Supabase + OpenAI. Zero build step.

## Pipeline

1. **Topics** - AI-generated content topics scored by relevance
2. **Briefs** - Intelligence briefs with thesis, hook, outline, and script
3. **Posts** - Platform-native posts (YouTube, LinkedIn, X, Instagram, Facebook)
4. **Metrics** - Engagement tracking across platforms
5. **One-click pipeline** - Generate topics -> brief -> posts in one call

## Setup

```bash
npm install
cp .env.example .env  # Fill in your credentials
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for content generation |
| `DEFAULT_WORKSPACE_ID` | Yes | Workspace UUID in Supabase |
| `PORT` | No | Server port (default: 3002) |

## Deployment

Deployed on Railway. No Dockerfile needed (auto-detected as Node.js).

Strength. Systems. Permanence.
