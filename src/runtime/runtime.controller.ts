import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RuntimeActionDto } from './dto/action.dto';

@Controller('api/runtime')
export class RuntimeController {
  constructor(private readonly runtime: RuntimeService) {}
  private ws(q?: string) { return q || process.env.DEFAULT_WORKSPACE_ID!; }

  @Get('summary') getSummary(@Query('workspaceId') ws: string) { return this.runtime.getSummary(this.ws(ws)); }
  @Get('jobs') getJobs(@Query('workspaceId') ws: string) { return this.runtime.getJobs(this.ws(ws)); }
  @Get('alerts') getAlerts(@Query('workspaceId') ws: string) { return this.runtime.getAlerts(this.ws(ws)); }
  @Get('settings') getSettings(@Query('workspaceId') ws: string) { return this.runtime.getSettings(this.ws(ws)); }
  @Patch('settings') updateSettings(@Query('workspaceId') ws: string, @Body() dto: UpdateSettingsDto) { return this.runtime.updateSettings(this.ws(ws), dto); }
  @Post('actions/generate-topics') generateTopics(@Body() dto: RuntimeActionDto) { return this.runtime.triggerGenerateTopics(dto.workspaceId, dto.count, dto.sourceNotes); }
  @Post('actions/create-briefs') createBriefs(@Body() dto: RuntimeActionDto) { return this.runtime.triggerCreateBriefs(dto.workspaceId, dto.count); }
  @Post('actions/generate-posts') generatePosts(@Body() dto: RuntimeActionDto) { return this.runtime.triggerGeneratePosts(dto.workspaceId, dto.count); }
  @Post('actions/schedule-content') scheduleContent(@Body() dto: RuntimeActionDto) { return this.runtime.triggerScheduleContent(dto.workspaceId, dto.count); }
  @Post('actions/refresh-metrics') refreshMetrics(@Body() dto: RuntimeActionDto) { return this.runtime.triggerRefreshMetrics(dto.workspaceId); }
}
