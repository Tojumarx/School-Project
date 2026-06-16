import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import firebase from 'firebase/compat/app';
import './History.css';

interface LogEntry {
    id: string;
    date: string;
    activity: string;
    status: string;
    photoProof?: string;
    timestamp?: firebase.firestore.Timestamp;
}

export const StudentHistory: React.FC = () => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filtered, setFiltered] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                // Fetch all logs initially
                fetchHistory('all', user.email!);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const fetchHistory = (mode: 'all' | 'custom', userEmail: string) => {
        setLoading(true);
        let query = db.collection('siwes_logs').where("email", "==", userEmail);

        if (mode === 'custom') {
            if (!startDate || !endDate) {
                alert("Please fill both date fields.");
                setLoading(false);
                return;
            }

            const startTS = firebase.firestore.Timestamp.fromDate(new Date(startDate));
            const endVal = new Date(endDate);
            endVal.setHours(23, 59, 59);
            const endTS = firebase.firestore.Timestamp.fromDate(endVal);

            query = query.where("timestamp", ">=", startTS).where("timestamp", "<=", endTS);
            setFiltered(true);
        } else {
            setFiltered(false);
        }

        query.orderBy("timestamp", "desc").onSnapshot(snapshot => {
            const list: LogEntry[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                list.push({
                    id: doc.id,
                    date: data.date || '',
                    activity: data.activity || '',
                    status: data.status || 'Pending',
                    photoProof: data.photoProof,
                    timestamp: data.timestamp
                });
            });
            setLogs(list);
            setLoading(false);
        }, err => {
            console.error("Firestore history snapshot error: ", err);
            // Fallback query if ordering + where query requires building composite indexes
            if (mode === 'custom') {
                alert("If this search fails, please check if Firestore composite indexes are built.");
            }
            setLoading(false);
        });
    };

    const handleApplyFilter = () => {
        const user = auth.currentUser;
        if (user) {
            fetchHistory('custom', user.email!);
        }
    };

    const handleResetFilter = () => {
        setStartDate('');
        setEndDate('');
        const user = auth.currentUser;
        if (user) {
            fetchHistory('all', user.email!);
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
