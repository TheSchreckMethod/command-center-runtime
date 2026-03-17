import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RUNTIME_QUEUES } from './queue.constants';
import { TopicProcessor } from './processors/topic.processor';
import { BriefProcessor } from './processors/brief.processor';
import { PostProcessor } from './processors/post.processor';
import { ScheduleProcessor } from './processors/schedule.processor';
import { MetricsProcessor } from './processors/metrics.processor';

@Module({
  imports: [
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
    BullModule.registerQueue(
      { name: RUNTIME_QUEUES.TOPIC }, { name: RUNTIME_QUEUES.BRIEF },
      { name: RUNTIME_QUEUES.POST }, { name: RUNTIME_QUEUES.SCHEDULE }, { name: RUNTIME_QUEUES.METRICS },
    ),
  ],
  providers: [TopicProcessor, BriefProcessor, PostProcessor, ScheduleProcessor, MetricsProcessor],
  exports: [BullModule],
})
export class QueueModule {}
