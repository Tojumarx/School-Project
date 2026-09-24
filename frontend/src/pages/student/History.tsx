import React, { useState, useEffect } from 'react';
import { supabase, BACKEND_URL } from '../../supabaseClient';
import './History.css';

interface LogEntry {
    id: string;
    date: string;
    activity: string;
    status: string;
    photoProof?: string;
}

export const StudentHistory: React.FC = () => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filtered, setFiltered] = useState<boolean>(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) {
                fetchHistory('all', session.user.email);
            }
        });
    }, []);

    const fetchHistory = async (mode: 'all' | 'custom', userEmail: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/entries?studentEmail=${encodeURIComponent(userEmail)}`);
            const data = await res.json();

            let list: LogEntry[] = data.map((d: any) => ({
                id: d.id,
                date: d.date || '',
                activity: d.description || '',
                status: d.status || 'Pending',
                photoProof: d.image_url
            }));

            if (mode === 'custom') {
                if (!startDate || !endDate) {
                    alert("Please fill both date fields.");
                    setLoading(false);
                    return;
                }
                list = list.filter(item => item.date >= startDate && item.date <= endDate);
                setFiltered(true);
            } else {
                setFiltered(false);
            }

            setLogs(list);
        } catch (err) {
            console.error("Failed to load history: ", err);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilter = async () => {
        const session = (await supabase.auth.getSession()).data.session;
        if (session?.user?.email) {
            fetchHistory('custom', session.user.email);
        }
    };

    const handleResetFilter = async () => {
        setStartDate('');
        setEndDate('');
        const session = (await supabase.auth.getSession()).data.session;
        if (session?.user?.email) {
            fetchHistory('all', session.user.email);
        }
    };

    return (
        <div className="card animated-fade-in">
            <h2 className="card-title">📊 Filter Log History</h2>
            
            <div className="filter-row">
                <div className="form-group">
                    <label>From Date</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                    />
                </div>
                <div className="form-group">
                    <label>To Date</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleApplyFilter} 
                        className="btn btn-primary" 
                        style={{ height: '44px', width: 'auto' }}
                    >
                        Apply Filter
                    </button>
                    {filtered && (
                        <button 
                            onClick={handleResetFilter} 
                            className="btn btn-danger" 
                            style={{ height: '44px', width: 'auto', backgroundColor: '#64748b' }}
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            <div id="logsDisplay">
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading logs history...</p>
                ) : logs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No logs matching this range.</p>
                ) : (
                    logs.map(log => (
                        <div key={log.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '20px 0', animation: 'scaleUp 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--primary-slate)', fontSize: '1.05rem' }}>🗓️ {log.date}</strong>
                                <span className={`status-badge status-${log.status}`}>{log.status}</span>
                            </div>
                            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{log.activity}</p>
                            {log.photoProof && (
                                <a 
                                    href={log.photoProof} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ fontSize: '0.8rem', color: 'var(--accent-sky)', fontWeight: 700, textDecoration: 'none' }}
                                >
                                    🖼️ Inspect Attachment
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
