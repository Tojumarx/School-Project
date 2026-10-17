import {
  Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, ParseIntPipe, StreamableFile,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth.guard';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- PUBLIC (used by the sign-up form) ---
  @Get('supervisors')
  getSupervisors() {
    return this.appService.getSupervisors();
  }

  @Post('auth/register')
  register(@Body() body: any) {
    return this.appService.registerUser(body);
  }

  // --- CURRENT USER ---
  @UseGuards(AuthGuard)
  @Get('auth/me')
  me(@Req() req: any) {
    return this.appService.me(req.user);
  }

  @UseGuards(AuthGuard)
  @Put('profile')
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.appService.updateProfile(req.user, body);
  }

  // --- STUDENTS (supervisor) ---
  @UseGuards(AuthGuard)
  @Get('students')
  getStudents(@Req() req: any) {
    return this.appService.getStudents(req.user);
  }

  @UseGuards(AuthGuard)
  @Post('students')
  createStudent(@Req() req: any, @Body() body: any) {
    return this.appService.createStudent(req.user, body);
  }

  // --- ENTRIES ---
  @UseGuards(AuthGuard)
  @Get('entries')
  getEntries(@Req() req: any) {
    return this.appService.getEntries(req.user);
  }

  @UseGuards(AuthGuard)
  @Post('entries')
  createEntry(@Req() req: any, @Body() body: any) {
    return this.appService.createEntry(req.user, body);
  }

  @UseGuards(AuthGuard)
  @Put('entries/:id/review')
  reviewEntry(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.appService.reviewEntry(req.user, id, body);
  }

  // --- BLOCKCHAIN PROOFS (OpenTimestamps) ---
  @UseGuards(AuthGuard)
  @Get('entries/:id/proof')
  getEntryProof(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.appService.getEntryProof(req.user, id);
  }

  @UseGuards(AuthGuard)
  @Get('entries/:id/proofs/:proofId/ots')
  async downloadOts(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('proofId', ParseIntPipe) proofId: number,
  ) {
    const { proof, bytes } = await this.appService.getEntryOtsFile(req.user, id, proofId);
    return new StreamableFile(bytes, {
      type: 'application/octet-stream',
      disposition: `attachment; filename="siwes-log-${id}-${proof.kind}-${proof.id}.ots"`,
    });
  }

  // --- MESSAGES ---
  @UseGuards(AuthGuard)
  @Get('messages/conversations')
  getConversations(@Req() req: any) {
    return this.appService.getConversations(req.user);
  }

  @UseGuards(AuthGuard)
  @Get('messages/thread')
  getThread(@Req() req: any, @Query('studentId') studentId?: string) {
    return this.appService.getThread(req.user, studentId ? Number(studentId) : undefined);
  }

  @UseGuards(AuthGuard)
  @Get('messages/broadcasts')
  getBroadcasts(@Req() req: any) {
    return this.appService.getBroadcasts(req.user);
  }

  @UseGuards(AuthGuard)
  @Get('messages/unread-count')
  getUnreadCount(@Req() req: any) {
    return this.appService.getUnreadCount(req.user);
  }

  @UseGuards(AuthGuard)
  @Post('messages')
  sendMessage(@Req() req: any, @Body() body: any) {
    return this.appService.sendMessage(req.user, body);
  }
}
