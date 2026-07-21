import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Controller('api')
export class AppController {
  constructor(private readonly supabaseService: SupabaseService) {}

  // --- ENTRIES ---
  @Get('entries')
  async getEntries(@Query('studentEmail') studentEmail?: string) {
    let query = this.supabaseService.getClient().from('entries').select('*').order('date', { ascending: false });
    if (studentEmail) {
      query = query.eq('student_email', studentEmail);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  @Post('entries')
  async createEntry(@Body() body: any) {
    const { data, error } = await this.supabaseService.getClient().from('entries').insert([body]).select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  @Put('entries/:id')
  async updateEntry(@Param('id') id: string, @Body() body: any) {
    const { data, error } = await this.supabaseService.getClient().from('entries').update(body).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  // --- ANNOUNCEMENTS ---
  @Get('announcements')
  async getAnnouncements() {
    const { data, error } = await this.supabaseService.getClient().from('announcements').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  @Post('announcements')
  async createAnnouncement(@Body() body: any) {
    const { data, error } = await this.supabaseService.getClient().from('announcements').insert([body]).select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  // --- MESSAGES ---
  @Get('messages')
  async getMessages(@Query('email') email?: string) {
    let query = this.supabaseService.getClient().from('messages').select('*').order('created_at', { ascending: true });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  @Post('messages')
  async sendMessage(@Body() body: any) {
    const { data, error } = await this.supabaseService.getClient().from('messages').insert([body]).select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  // --- PROFILES / STUDENTS ---
  @Get('students')
  async getStudents() {
    const { data, error } = await this.supabaseService.getClient().from('profiles').select('*').eq('role', 'student');
    if (error) throw new Error(error.message);
    return data;
  }
}
