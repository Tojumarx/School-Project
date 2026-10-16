export type Role = 'student' | 'supervisor';
export type EntryStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SupervisorSummary {
    id: number;
    full_name: string;
    title: string | null;
    email: string;
    department: string | null;
    institution: string | null;
    office_loc: string | null;
}

export interface Profile {
    id: number;
    email: string;
    role: Role;
    full_name: string;
    student_id: string | null;
    course: string | null;
    level: string | null;
    department: string | null;
    institution: string | null;
    gender: string | null;
    dob: string | null;
    avatar_url: string | null;
    title: string | null;
    office_loc: string | null;
    supervisor_id: number | null;
    supervisor?: SupervisorSummary | null;
}

export interface Entry {
    id: number;
    created_at: string;
    date: string;
    description: string;
    image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    status: EntryStatus;
    supervisor_comment: string | null;
    reviewed_at: string | null;
    student_email: string;
    student_name: string | null;
    user_id: number | null;
}

export interface Message {
    id: number;
    created_at: string;
    content: string;
    is_broadcast: boolean;
    read: boolean;
    sender_id: number;
    receiver_id: number | null;
}

export interface StudentRow extends Profile {
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        lastLogDate: string | null;
    };
}

export interface Conversation {
    student: { id: number; full_name: string; email: string; avatar_url: string | null };
    last: Message | null;
    unread: number;
}
