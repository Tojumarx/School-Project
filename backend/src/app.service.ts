import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SupabaseService } from './supabase.service';

type DbUser = {
  id: number;
  email: string;
  role: string;
  full_name: string;
  supervisor_id: number | null;
  [key: string]: any;
};

const SUPERVISOR_PUBLIC = {
  id: true,
  full_name: true,
  title: true,
  email: true,
  department: true,
  institution: true,
  office_loc: true,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  getHello(): string {
    return 'SIWES Backend API Operational (Database Connected via Prisma)';
  }

  // ---------- helpers ----------
  private strip(user: any) {
    if (!user) return user;
    const { password, ...safe } = user;
    return safe;
  }

  private requireRole(user: DbUser, role: 'student' | 'supervisor') {
    if (user.role !== role) {
      throw new ForbiddenException(`This action is only available to ${role}s`);
    }
  }

  private async ownStudent(supervisor: DbUser, studentId: number) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'student' || student.supervisor_id !== supervisor.id) {
      throw new ForbiddenException('That student is not assigned to you');
    }
    return student;
  }

  private async resolveSupervisorId(raw: any): Promise<number | null> {
    if (raw === undefined || raw === null || raw === '') return null;
    const id = Number(raw);
    if (!Number.isInteger(id)) throw new BadRequestException('Invalid supervisor');
    const sup = await this.prisma.user.findUnique({ where: { id } });
    if (!sup || sup.role !== 'supervisor') throw new BadRequestException('Selected supervisor does not exist');
    return sup.id;
  }

  // ---------- AUTH / PROFILE ----------
  async me(user: DbUser) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { supervisor: { select: SUPERVISOR_PUBLIC } },
    });
    return this.strip(full);
  }

  async registerUser(body: any) {
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const fullName = String(body?.full_name || '').trim();
    const role = body?.role === 'supervisor' ? 'supervisor' : 'student';

    if (!email || !fullName) throw new BadRequestException('Name and email are required');
    if (password.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const supervisorId = role === 'student' ? await this.resolveSupervisorId(body.supervisor_id) : null;

    const client = this.supabaseService.getClient();
    const { data: created, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error || !created.user) {
      throw new BadRequestException(error?.message || 'Could not create the sign-in account');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: 'managed_by_supabase',
          full_name: fullName,
          role,
          department: body.department || null,
          institution: body.institution || null,
          student_id: role === 'student' ? body.student_id || null : null,
          course: role === 'student' ? body.course || null : null,
          level: role === 'student' ? body.level || null : null,
          gender: role === 'student' ? body.gender || null : null,
          supervisor_id: supervisorId,
          title: role === 'supervisor' ? body.title || null : null,
          office_loc: role === 'supervisor' ? body.office_loc || null : null,
        },
      });
      return { message: 'Account created', user: this.strip(user) };
    } catch (err: any) {
      // Do not leave an orphaned sign-in account behind
      await client.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      throw new BadRequestException(`Could not save profile: ${err.message}`);
    }
  }

  async updateProfile(user: DbUser, body: any) {
    const data: Record<string, any> = {};
    const textFields = [
      'full_name', 'gender', 'dob', 'avatar_url', 'department', 'institution',
      'student_id', 'course', 'level', 'title', 'office_loc',
    ];
    for (const key of textFields) {
      if (body[key] !== undefined) data[key] = body[key] === '' ? null : String(body[key]).trim();
    }
    if (data.full_name === null) throw new BadRequestException('Name cannot be empty');

    if (user.role === 'student' && body.supervisor_id !== undefined) {
      data.supervisor_id = await this.resolveSupervisorId(body.supervisor_id);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      include: { supervisor: { select: SUPERVISOR_PUBLIC } },
    });
    return this.strip(updated);
  }

  async getSupervisors() {
    return this.prisma.user.findMany({
      where: { role: 'supervisor' },
      select: SUPERVISOR_PUBLIC,
      orderBy: { full_name: 'asc' },
    });
  }

  // ---------- STUDENTS (supervisor view) ----------
  async getStudents(user: DbUser) {
    this.requireRole(user, 'supervisor');
    const students = await this.prisma.user.findMany({
      where: { role: 'student', supervisor_id: user.id },
      orderBy: { full_name: 'asc' },
      include: { entries: { select: { status: true, date: true } } },
    });
    return students.map((s) => {
      const { entries, ...rest } = s;
      return {
        ...this.strip(rest),
        stats: {
          total: entries.length,
          pending: entries.filter((e) => e.status === 'Pending').length,
          approved: entries.filter((e) => e.status === 'Approved').length,
          rejected: entries.filter((e) => e.status === 'Rejected').length,
          lastLogDate: entries.map((e) => e.date).sort().pop() || null,
        },
      };
    });
  }

  async createStudent(user: DbUser, body: any) {
    this.requireRole(user, 'supervisor');
    const result = await this.registerUser({
      ...body,
      role: 'student',
      supervisor_id: user.id,
      department: body.department || user.department,
      institution: body.institution || user.institution,
    });
    return result;
  }

  // ---------- ENTRIES ----------
  async getEntries(user: DbUser) {
    if (user.role === 'supervisor') {
      return this.prisma.entry.findMany({
        where: { user: { supervisor_id: user.id } },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });
    }
    return this.prisma.entry.findMany({
      where: { user_id: user.id },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async createEntry(user: DbUser, body: any) {
    this.requireRole(user, 'student');

    const date = String(body?.date || '');
    const description = String(body?.description || '').trim();
    if (!DATE_RE.test(date)) throw new BadRequestException('Choose a valid work date');
    if (description.length < 10) throw new BadRequestException('Describe the work done (at least 10 characters)');

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (date > todayStr) throw new BadRequestException('You cannot log work for a future date');

    const lat = body.latitude !== undefined && body.latitude !== null ? Number(body.latitude) : null;
    const lng = body.longitude !== undefined && body.longitude !== null ? Number(body.longitude) : null;

    const payload = {
      description,
      image_url: body.image_url ? String(body.image_url).trim() : null,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      location_name: body.location_name ? String(body.location_name).trim() : null,
    };

    const existing = await this.prisma.entry.findFirst({ where: { user_id: user.id, date } });
    if (existing) {
      if (existing.status !== 'Rejected') {
        throw new ConflictException('You have already logged work for this date');
      }
      // A rejected log can be corrected and resubmitted for review
      return this.prisma.entry.update({
        where: { id: existing.id },
        data: { ...payload, status: 'Pending', supervisor_comment: null, reviewed_at: null },
      });
    }

    return this.prisma.entry.create({
      data: {
        ...payload,
        date,
        status: 'Pending',
        student_email: user.email,
        student_name: user.full_name,
        user_id: user.id,
      },
    });
  }

  async reviewEntry(user: DbUser, id: number, body: any) {
    this.requireRole(user, 'supervisor');
    const status = body?.status;
    if (status !== 'Approved' && status !== 'Rejected') {
      throw new BadRequestException('Status must be Approved or Rejected');
    }
    const comment = body?.comment ? String(body.comment).trim() : '';
    if (status === 'Rejected' && !comment) {
      throw new BadRequestException('Add a comment explaining why the log is being rejected');
    }

    const entry = await this.prisma.entry.findUnique({ where: { id }, include: { user: true } });
    if (!entry) throw new NotFoundException('Log entry not found');
    if (!entry.user || entry.user.supervisor_id !== user.id) {
      throw new ForbiddenException('This log belongs to a student you do not supervise');
    }

    return this.prisma.entry.update({
      where: { id },
      data: { status, supervisor_comment: comment || null, reviewed_at: new Date() },
    });
  }

  // ---------- MESSAGES ----------
  async getConversations(user: DbUser) {
    this.requireRole(user, 'supervisor');
    const students = await this.prisma.user.findMany({
      where: { role: 'student', supervisor_id: user.id },
      select: { id: true, full_name: true, email: true, avatar_url: true },
      orderBy: { full_name: 'asc' },
    });
    const direct = await this.prisma.message.findMany({
      where: { is_broadcast: false, OR: [{ sender_id: user.id }, { receiver_id: user.id }] },
      orderBy: { created_at: 'desc' },
    });

    return students
      .map((s) => {
        const thread = direct.filter((m) => m.sender_id === s.id || m.receiver_id === s.id);
        return {
          student: s,
          last: thread[0] || null,
          unread: thread.filter((m) => m.sender_id === s.id && !m.read).length,
        };
      })
      .sort((a, b) => {
        const at = a.last ? a.last.created_at.getTime() : 0;
        const bt = b.last ? b.last.created_at.getTime() : 0;
        return bt - at || a.student.full_name.localeCompare(b.student.full_name);
      });
  }

  async getThread(user: DbUser, studentId?: number) {
    if (user.role === 'supervisor') {
      if (!studentId) throw new BadRequestException('Choose a student');
      await this.ownStudent(user, studentId);
      const messages = await this.prisma.message.findMany({
        where: {
          is_broadcast: false,
          OR: [
            { sender_id: user.id, receiver_id: studentId },
            { sender_id: studentId, receiver_id: user.id },
          ],
        },
        orderBy: { created_at: 'asc' },
      });
      await this.prisma.message.updateMany({
        where: { sender_id: studentId, receiver_id: user.id, read: false },
        data: { read: true },
      });
      return messages;
    }

    // Student: private thread with supervisor + broadcasts from that supervisor
    if (!user.supervisor_id) return [];
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { is_broadcast: false, sender_id: user.id, receiver_id: user.supervisor_id },
          { is_broadcast: false, sender_id: user.supervisor_id, receiver_id: user.id },
          { is_broadcast: true, sender_id: user.supervisor_id },
        ],
      },
      orderBy: { created_at: 'asc' },
    });
    await this.prisma.message.updateMany({
      where: { sender_id: user.supervisor_id, receiver_id: user.id, read: false },
      data: { read: true },
    });
    return messages;
  }

  async getBroadcasts(user: DbUser) {
    this.requireRole(user, 'supervisor');
    return this.prisma.message.findMany({
      where: { sender_id: user.id, is_broadcast: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getUnreadCount(user: DbUser) {
    const count = await this.prisma.message.count({
      where: { receiver_id: user.id, read: false, is_broadcast: false },
    });
    return { count };
  }

  async sendMessage(user: DbUser, body: any) {
    const content = String(body?.content || '').trim();
    if (!content) throw new BadRequestException('Message cannot be empty');
    if (content.length > 2000) throw new BadRequestException('Message is too long (2000 characters max)');

    if (user.role === 'student') {
      if (!user.supervisor_id) {
        throw new BadRequestException('You have no supervisor assigned yet. Choose one in Settings.');
      }
      return this.prisma.message.create({
        data: { content, sender_id: user.id, receiver_id: user.supervisor_id },
      });
    }

    if (body?.broadcast) {
      return this.prisma.message.create({
        data: { content, sender_id: user.id, is_broadcast: true },
      });
    }

    const studentId = Number(body?.student_id);
    if (!Number.isInteger(studentId)) throw new BadRequestException('Choose a student to message');
    await this.ownStudent(user, studentId);
    return this.prisma.message.create({
      data: { content, sender_id: user.id, receiver_id: studentId },
    });
  }
}
