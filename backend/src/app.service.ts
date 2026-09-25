import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'SIWES Backend API Operational (Database Connected via Prisma)';
  }

  // --- ENTRIES ---
  async getEntries(studentEmail?: string) {
    return this.prisma.entry.findMany({
      where: studentEmail ? { student_email: studentEmail } : {},
      orderBy: { created_at: 'desc' },
    });
  }

  async createEntry(body: any) {
    return this.prisma.entry.create({
      data: {
        date: body.date || new Date().toISOString(),
        day: body.day || 'Today',
        activity: body.activity || '',
        learnings: body.learnings || '',
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        location_name: body.location_name || '',
        student_email: body.student_email || '',
      },
    });
  }

  async updateEntry(id: string, body: any) {
    return this.prisma.entry.update({
      where: { id: parseInt(id, 10) },
      data: body,
    });
  }

  // --- ANNOUNCEMENTS ---
  async getAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async createAnnouncement(body: any) {
    return this.prisma.announcement.create({
      data: {
        title: body.title,
        content: body.content,
      },
    });
  }

  // --- MESSAGES ---
  async getMessages(email?: string) {
    return this.prisma.message.findMany({
      orderBy: { created_at: 'asc' },
    });
  }

  async sendMessage(body: any) {
    return this.prisma.message.create({
      data: {
        sender_email: body.sender_email || body.email || '',
        content: body.content || body.message || '',
      },
    });
  }

  // --- USERS & SUPERVISORS ---
  async getStudents() {
    return this.prisma.user.findMany({
      where: { role: 'student' },
    });
  }

  async getSupervisors(searchQuery?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'supervisor',
        ...(searchQuery
          ? {
              full_name: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            }
          : {}),
      },
    });
  }

  async updateProfile(userId: string, body: any) {
    return this.prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: body,
    });
  }
}
