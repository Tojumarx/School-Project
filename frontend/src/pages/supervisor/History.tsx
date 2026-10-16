import React, { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/dates';
import type { Entry, EntryStatus } from '../../lib/types';
import { Alert, Avatar, Empty, Icon, PageHeader, StatusBadge } from '../../components/ui';

export const SupervisorHistory: React.FC = () => {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'All' | EntryStatus>('All');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    useEffect(() => {
        api<Entry[]>('/entries')
            .then(setEntries)
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setLoading(false));
    }, []);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entries.filter(
            (e) =>
                (status === 'All' || e.status === status) &&
                (!from || e.date >= from) &&
                (!to || e.date <= to) &&
                (!q || (e.student_name || '').toLowerCase().includes(q) || e.student_email.toLowerCase().includes(q)),
        );
    }, [entries, search, status, from, to]);

    return (
        <>
            <PageHeader title="Logbook archive" subtitle="Every log from your students, searchable by name, status and date." />

            <section className="card">
                <div className="filter-bar">
                    <div className="field grow">
                        <label htmlFor="q">Student</label>
                        <div className="search search-block">
                            <Icon name="search" size={16} />
                            <input id="q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" />
                        </div>
                    </div>
                    <div className="field">
                        <label htmlFor="st">Status</label>
                        <select id="st" value={status} onChange={(e) => setStatus(e.target.value as 'All' | EntryStatus)}>
                            <option>All</option>
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="f">From</label>
                        <input id="f" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="field">
                        <label htmlFor="t">To</label>
                        <input id="t" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                    </div>
                </div>

                {error && <Alert kind="error">{error}</Alert>}

                {loading ? (
                    <p className="muted pad">Loading…</p>
                ) : shown.length === 0 ? (
                    <Empty icon="history" title="No logs found">
                        {entries.length ? 'No logs match these filters.' : 'Logs from your students will be archived here.'}
                    </Empty>
                ) : (
                    <>
                        <p className="muted small count">{shown.length} log{shown.length === 1 ? '' : 's'}</p>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Date</th>
                                        <th>Work done</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((e) => (
                                        <tr key={e.id}>
                                            <td data-label="Student">
                                                <div className="person">
                                                    <Avatar name={e.student_name || e.student_email} size={32} />
                                                    <div className="person-text">
                                                        <strong>{e.student_name || e.student_email}</strong>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Date" className="nowrap">{formatDate(e.date)}</td>
                                            <td data-label="Work done">
                                                <p className="clamp">{e.description}</p>
                                                {e.supervisor_comment && (
                                                    <small className="muted"><Icon name="message" size={12} /> {e.supervisor_comment}</small>
                                                )}
                                            </td>
                                            <td data-label="Status"><StatusBadge status={e.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </>
    );
};
