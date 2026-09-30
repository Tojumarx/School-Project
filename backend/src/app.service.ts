import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SupabaseService } from './supabase.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  getHello(): string {
    return 'SIWES Backend API Operational (Database Connected via Prisma)';
  }

  // --- AUTH & USER SYNC ---
  async syncUser(userData: any) {
    if (!userData || !userData.email) {
      throw new BadRequestException('Email is required to sync user profile');
    }

    const email = userData.email.trim();

    try {
      const existing = await this.prisma.user.findUnique({
        where: { email },
      });

      // Resolve supervisor_id if supervisor_email or supervisor_id is provided
      let supervisorId: number | null = userData.supervisor_id ? Number(userData.supervisor_id) : null;
      if (!supervisorId && userData.supervisor_email) {
        const sup = await this.prisma.user.findUnique({
          where: { email: userData.supervisor_email.trim() },
        });
        if (sup) {
          supervisorId = sup.id;
        }
      }

      if (existing) {
        return await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            full_name: userData.full_name || existing.full_name,
            role: userData.role || existing.role,
            student_id: userData.student_id ?? existing.student_id,
            course: userData.course ?? existing.course,
            level: userData.level ?? existing.level,
            department: userData.department ?? existing.department,
            institution: userData.institution ?? existing.institution,
            gender: userData.gender ?? existing.gender,
            title: userData.title ?? existing.title,
            office_loc: userData.office_loc ?? existing.office_loc,
            supervisor_id: supervisorId ?? existing.supervisor_id,
          },
        });
      }

      return await this.prisma.user.create({
        data: {
          email,
          password: userData.password || 'managed_by_supabase',
          full_name: userData.full_name || email.split('@')[0],
          role: userData.role || 'student',
          student_id: userData.student_id || null,
          course: userData.course || null,
          level: userData.level || null,
          department: userData.department || null,
          institution: userData.institution || null,
          gender: userData.gender || null,
          title: userData.title || null,
          office_loc: userData.office_loc || null,
          supervisor_id: supervisorId,
        },
      });
    } catch (error: any) {
      console.error('Failed to sync user to Database:', error);
      throw new BadRequestException(`Database Save Error: ${error.message || 'Unable to persist user to database'}`);
    }
  }

  async registerUser(body: any) {
    if (!body || !body.email) {
      throw new BadRequestException('Email is required for account registration');
    }

    // 1. Save directly into PostgreSQL database via Prisma
    const syncedUser = await this.syncUser(body);

    // 2. Register on Supabase Auth (optional background sync)
    try {
      const client = this.supabaseService.getClient();
      if (client && body.password) {
        await client.auth.signUp({
          email: body.email.trim(),
          password: body.password,
          options: {
            data: body,
          },
        });
      }
    } catch (err: any) {
      console.warn('Supabase Auth optional warning:', err.message);
    }

    return {
      message: 'Account created and saved to database successfully',
      user: syncedUser,
    };
  }

  async loginUser(body: any) {
    const { email, password } = body;
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user && data.user) {
      user = await this.syncUser({
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || email.split('@')[0],
        role: data.user.user_metadata?.role || 'student',
        ...data.user.user_metadata,
      });
    }

    return {
      session: data.session,
      user,
    };
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
