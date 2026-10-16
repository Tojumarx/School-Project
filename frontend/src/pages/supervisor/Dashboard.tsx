import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, startOfWeekStr } from '../../lib/dates';
import type { Entry } from '../../lib/types';
import { Alert, Avatar, Empty, Icon, MonthCalendar, Stat, type DayMark } from '../../components/ui';
import banner from '../../assets/supervisor-banner.jpg';

export const SupervisorDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [studentCount, setStudentCount] = useState(0);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [list, students, msgs] = await Promise.all([
                api<Entry[]>('/entries'),
                api<unknown[]>('/students'),
                api<{ count: number }>('/messages/unread-count'),
            ]);
            setEntries(list);
            setStudentCount(students.length);
            setUnread(msgs.count);
            setError('');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const pending = useMemo(() => entries.filter((e) => e.status === 'Pending').sort((a, b) => a.date.localeCompare(b.date)), [entries]);
    const queue = pending.filter((e) => {
        const q = search.trim().toLowerCase();
        return !q || (e.student_name || '').toLowerCase().includes(q) || e.student_email.toLowerCase().includes(q);
    });
    const weekStart = startOfWeekStr();
    const reviewedThisWeek = entries.filter((e) => e.reviewed_at && e.reviewed_at.slice(0, 10) >= weekStart).length;

    const marks = useMemo(() => {
        const m: Record<string, DayMark> = {};
        pending.forEach((e) => (m[e.date] = 'Pending'));
        return m;
    }, [pending]);

    const review = async (id: number, status: 'Approved' | 'Rejected', note?: string) => {
        setBusyId(id);
        setError('');
        try {
            await api(`/entries/${id}/review`, { method: 'PUT', body: { status, comment: note } });
            setRejectingId(null);
            setComment('');
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <section className="banner" style={{ backgroundImage: `url(${banner})` }}>
                <div className="banner-text">
                    <small>{[profile?.department, profile?.institution].filter(Boolean).join(' · ')}</small>
                    <h1>
                        Welcome, {profile?.title} {profile?.full_name.split(' ').slice(-1)[0]}
                    </h1>
                    <p>
                        {pending.length === 0
                            ? 'Your review queue is clear.'
                            : `${pending.length} log${pending.length === 1 ? '' : 's'} waiting for your review.`}
                    </p>
                </div>
            </section>

            <div className="stats">
                <Stat icon="clock" tone="amber" label="Awaiting review" value={pending.length} />
                <Stat icon="check-circle" tone="green" label="Reviewed this week" value={reviewedThisWeek} />
                <Stat icon="users" tone="brand" label="Students" value={studentCount} />
                <Stat icon="message" tone="slate" label="Unread messages" value={unread} />
            </div>

            {error && <Alert kind="error">{error}</Alert>}

            <div className="layout-2">
                <section className="card">
                    <div className="card-head">
                        <h2>Review queue</h2>
                        <div className="search">
                            <Icon name="search" size={16} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by student" aria-label="Filter by student" />
                        </div>
                    </div>

                    {loading ? (
                        <p className="muted pad">Loading…</p>
                    ) : studentCount === 0 ? (
                        <Empty icon="users" title="No students assigned yet">
                            Students choose you as their supervisor when they sign up, or you can <Link to="/supervisor/students">add one</Link>.
                        </Empty>
                    ) : queue.length === 0 ? (
                        <Empty icon="check-circle" title={pending.length ? 'No matches' : 'All caught up'}>
                            {pending.length ? 'No pending logs match that name.' : 'New student logs will appear here for review.'}
                        </Empty>
                    ) : (
                        <ul className="review-list">
                            {queue.map((e) => (
                                <li key={e.id} className="review">
                                    <div className="review-head">
                                        <Avatar name={e.student_name || e.student_email} size={38} />
                                        <div className="person-text">
                                            <strong>{e.student_name || e.student_email}</strong>
                                            <small>{e.student_email}</small>
                                        </div>
                                        <span className="review-date">{formatDate(e.date)}</span>
                                    </div>

                                    <p className="log-body">{e.description}</p>
                                    {e.image_url && (
                                        <a href={e.image_url} target="_blank" rel="noreferrer" className="log-photo">
                                            <img src={e.image_url} alt="Work evidence" loading="lazy" />
                                        </a>
                                    )}

                                    <div className="review-links">
                                        {e.latitude !== null && e.longitude !== null && (
                                            <a href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`} target="_blank" rel="noreferrer" className="link-sm">
                                                <Icon name="pin" size={14} /> View location
                                            </a>
                                        )}
                                        {e.image_url && (
                                            <a href={e.image_url} target="_blank" rel="noreferrer" className="link-sm">
                                                <Icon name="image" size={14} /> View attachment
                                            </a>
                                        )}
                                    </div>

                                    {rejectingId === e.id ? (
                                        <div className="reject-box">
                                            <label htmlFor={`c${e.id}`}>What needs to change?</label>
                                            <textarea
                                                id={`c${e.id}`}
                                                rows={3}
                                                autoFocus
                                                value={comment}
                                                onChange={(ev) => setComment(ev.target.value)}
                                                placeholder="The student will see this and can resubmit a corrected log."
                                            />
                                            <div className="row-actions">
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    disabled={busyId === e.id || !comment.trim()}
                                                    onClick={() => review(e.id, 'Rejected', comment)}
                                                >
                                                    Reject with feedback
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingId(null); setComment(''); }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="row-actions">
                                            <button className="btn btn-primary btn-sm" disabled={busyId === e.id} onClick={() => review(e.id, 'Approved')}>
                                                <Icon name="check" size={14} /> Approve
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => { setRejectingId(e.id); setComment(''); }}>
                                                <Icon name="x" size={14} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside className="side-stack">
                    <section className="card">
                        <div className="card-head">
                            <h2>Pending by date</h2>
                        </div>
                        <MonthCalendar marks={marks} />
                    </section>
                </aside>
            </div>
        </>
    );
};
