import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { formatDate, formatTime } from '../../lib/dates';
import type { Entry, EntryStatus } from '../../lib/types';
import { Alert, Empty, Icon, PageHeader, StatusBadge } from '../../components/ui';
import { AnchorBadge, ProofCheck } from '../../components/Proof';

const FILTERS: Array<'All' | EntryStatus> = ['All', 'Pending', 'Approved', 'Rejected'];

export const StudentHistory: React.FC = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'All' | EntryStatus>('All');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    useEffect(() => {
        api<Entry[]>('/entries')
            .then(setEntries)
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setLoading(false));
    }, []);

    const shown = useMemo(
        () =>
            entries.filter(
                (e) => (status === 'All' || e.status === status) && (!from || e.date >= from) && (!to || e.date <= to),
            ),
        [entries, status, from, to],
    );

    const count = (s: 'All' | EntryStatus) => (s === 'All' ? entries.length : entries.filter((e) => e.status === s).length);
    const filtered = status !== 'All' || from || to;

    return (
        <>
            <PageHeader title="My logbook" subtitle="Every entry you've submitted, with your supervisor's feedback." />

            <section className="card">
                <div className="filters">
                    <div className="chips" role="group" aria-label="Filter by status">
                        {FILTERS.map((f) => (
                            <button key={f} className={`chip ${status === f ? 'on' : ''}`} onClick={() => setStatus(f)}>
                                {f} <span>{count(f)}</span>
                            </button>
                        ))}
                    </div>
                    <div className="date-range">
                        <div className="field">
                            <label htmlFor="from">From</label>
                            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="to">To</label>
                            <input id="to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        {filtered && (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                    setStatus('All');
                                    setFrom('');
                                    setTo('');
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {error && <Alert kind="error">{error}</Alert>}

                {loading ? (
                    <p className="muted pad">Loading your logs…</p>
                ) : shown.length === 0 ? (
                    <Empty icon="book" title={entries.length === 0 ? 'No logs yet' : 'No logs match these filters'}>
                        {entries.length === 0 ? 'Your first entry will show up here once you submit it.' : 'Try widening the date range or status.'}
                    </Empty>
                ) : (
                    <ul className="log-list">
                        {shown.map((e) => (
                            <li key={e.id} className={`log log-${e.status.toLowerCase()}`}>
                                <div className="log-top">
                                    <strong>{formatDate(e.date)}</strong>
                                    <span className="badge-row">
                                        <AnchorBadge anchor={e.anchor} />
                                        <StatusBadge status={e.status} />
                                    </span>
                                </div>
                                <p className="log-body">{e.description}</p>
                                {e.image_url && (
                                    <a href={e.image_url} target="_blank" rel="noreferrer" className="log-photo">
                                        <img src={e.image_url} alt="Work evidence" loading="lazy" />
                                    </a>
                                )}

                                {e.supervisor_comment && (
                                    <div className="feedback-box">
                                        <Icon name="message" size={14} />
                                        <div>
                                            <strong>Supervisor feedback</strong>
                                            <p>{e.supervisor_comment}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="log-foot">
                                    <span className="muted">Submitted {formatTime(e.created_at)}</span>
                                    {e.image_url && (
                                        <a href={e.image_url} target="_blank" rel="noreferrer" className="link-sm">
                                            <Icon name="image" size={14} /> Attachment
                                        </a>
                                    )}
                                    {e.status === 'Rejected' && (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() =>
                                                navigate('/student/dashboard', {
                                                    state: { date: e.date, description: e.description, image_url: e.image_url },
                                                })
                                            }
                                        >
                                            Fix and resubmit
                                        </button>
                                    )}
                                </div>
                                <ProofCheck entryId={e.id} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
};
