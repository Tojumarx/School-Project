import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- ENTRIES ---
  @Get('entries')
  async getEntries(@Query('studentEmail') studentEmail?: string) {
    return this.appService.getEntries(studentEmail);
  }

  @Post('entries')
  async createEntry(@Body() body: any) {
    return this.appService.createEntry(body);
  }

  @Put('entries/:id')
  async updateEntry(@Param('id') id: string, @Body() body: any) {
    return this.appService.updateEntry(id, body);
  }

  // --- ANNOUNCEMENTS ---
  @Get('announcements')
  async getAnnouncements() {
    return this.appService.getAnnouncements();
  }

  @Post('announcements')
  async createAnnouncement(@Body() body: any) {
    return this.appService.createAnnouncement(body);
  }

  // --- MESSAGES ---
  @Get('messages')
  async getMessages(@Query('email') email?: string) {
    return this.appService.getMessages(email);
  }

  @Post('messages')
  async sendMessage(@Body() body: any) {
    return this.appService.sendMessage(body);
  }

  // --- USERS / STUDENTS / SUPERVISORS ---
  @Get('students')
  async getStudents() {
    return this.appService.getStudents();
  }

  @Get('supervisors')
  async getSupervisors(@Query('query') query?: string) {
    return this.appService.getSupervisors(query);
  }

  @Put('profiles/:id')
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.appService.updateProfile(id, body);
  }
}
