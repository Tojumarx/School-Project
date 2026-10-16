import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/dates';
import type { StudentRow } from '../../lib/types';
import { Alert, Avatar, Empty, Icon, PageHeader } from '../../components/ui';

export const SupervisorStudents: React.FC = () => {
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adding, setAdding] = useState(false);
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState('');

    const load = useCallback(async () => {
        try {
            setStudents(await api<StudentRow[]>('/students'));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setSuccess('');
        setAdding(true);
        try {
            await api('/students', { method: 'POST', body: { full_name: name.trim(), email: email.trim(), password } });
            setSuccess(`Account created for ${name.trim()}. Share the email and temporary password with them.`);
            setName('');
            setEmail('');
            setPassword('');
            await load();
        } catch (err) {
            setFormError(errorMessage(err));
        } finally {
            setAdding(false);
        }
    };

    const q = search.trim().toLowerCase();
    const shown = students.filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.student_id || '').toLowerCase().includes(q));

    return (
        <>
            <PageHeader title="My students" subtitle={`${students.length} student${students.length === 1 ? '' : 's'} under your supervision.`} />
            {error && <Alert kind="error">{error}</Alert>}

            <div className="layout-2 layout-2-wide">
                <section className="card">
                    <div className="card-head">
                        <h2>Students</h2>
                        <div className="search">
                            <Icon name="search" size={16} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or matric" aria-label="Search students" />
                        </div>
                    </div>

                    {loading ? (
                        <p className="muted pad">Loading…</p>
                    ) : shown.length === 0 ? (
                        <Empty icon="users" title={students.length ? 'No matches' : 'No students yet'}>
                            {students.length ? 'Try a different search.' : 'Students appear here when they pick you as their supervisor, or add one with the form.'}
                        </Empty>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Logs</th>
                                        <th>Pending</th>
                                        <th>Last log</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((s) => (
                                        <tr key={s.id}>
                                            <td data-label="Student">
                                                <div className="person">
                                                    <Avatar name={s.full_name} url={s.avatar_url} size={36} />
                                                    <div className="person-text">
                                                        <strong>{s.full_name}</strong>
                                                        <small>{[s.student_id, s.course, s.level ? `${s.level}L` : null].filter(Boolean).join(' · ') || s.email}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Logs">{s.stats.total}</td>
                                            <td data-label="Pending">
                                                {s.stats.pending > 0 ? <span className="badge badge-pending">{s.stats.pending}</span> : <span className="muted">0</span>}
                                            </td>
                                            <td data-label="Last log">{s.stats.lastLogDate ? formatDate(s.stats.lastLogDate) : <span className="muted">Never</span>}</td>
                                            <td className="cell-action">
                                                <Link to={`/supervisor/messages?student=${s.id}`} className="btn btn-secondary btn-sm">
                                                    <Icon name="message" size={14} /> Message
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <aside className="side-stack">
                    <section className="card">
                        <div className="card-head">
                            <h2>Add a student</h2>
                        </div>
                        <p className="muted small">Create an account for a student and assign them to yourself.</p>
                        {formError && <Alert kind="error">{formError}</Alert>}
                        {success && <Alert kind="success">{success}</Alert>}
                        <form onSubmit={create} className="stack">
                            <div className="field">
                                <label htmlFor="sn">Full name</label>
                                <input id="sn" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label htmlFor="se">Email</label>
                                <input id="se" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label htmlFor="sp">Temporary password</label>
                                <input id="sp" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={adding}>
                                {adding ? 'Creating…' : 'Create account'}
                            </button>
                        </form>
                    </section>
                </aside>
            </div>
        </>
    );
};
