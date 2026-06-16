import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import './Dashboard.css';

interface LogPipelineEntry {
    id: string;
    studentName: string;
    email: string;
    date: string;
    activity: string;
    photoProof: string;
    location: {
        lat: number;
        lng: number;
    };
    status: string;
}

export const SupervisorDashboard: React.FC = () => {
    const [pendingLogs, setPendingLogs] = useState<LogPipelineEntry[]>([]);
    const [searchVal, setSearchVal] = useState<string>('');
    const [yesterdayCount, setYesterdayCount] = useState<number>(0);
    const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
    const [totalPending, setTotalPending] = useState<number>(0);
    const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                // Fetch metrics
                fetchMetrics();

                // Listen to pending logs in pipeline
                const unsubscribeLogs = db.collection('siwes_logs')
                    .where("status", "==", "Pending")
                    .orderBy("timestamp", "desc")
                    .onSnapshot(snap => {
                        const list: LogPipelineEntry[] = [];
                        const datesSet = new Set<string>();

                        snap.forEach(doc => {
                            const d = doc.data();
                            if (d.date) {
                                datesSet.add(d.date);
                            }
                            list.push({
                                id: doc.id,
                                studentName: d.studentName || 'Student',
                                email: d.email || '',
                                date: d.date || '',
                                activity: d.activity || '',
                                photoProof: d.photoProof || '',
                                location: {
                                    lat: d.location?.lat || 0,
                                    lng: d.location?.lng || 0
                                },
                                status: d.status || 'Pending'
                            });
                        });

                        setPendingLogs(list);
                        setPendingDates(datesSet);
                        // Refresh metrics counts when snap changes
                        setTotalPending(snap.size);
                    });

                return () => {
                    unsubscribeLogs();
                };
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const fetchMetrics = () => {
        const today = new Date();
        const yesterdayStr = getFormattedOffsetDate(-1);

        const startOfWeek = new Date();
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        db.collection('siwes_logs').where("status", "==", "Pending").get().then(snap => {
            setTotalPending(snap.size);
        });

        db.collection('siwes_logs').get().then(snap => {
            let yesterday = 0;
            let weekly = 0;

            snap.forEach(doc => {
                const d = doc.data();
                if (d.date === yesterdayStr) {
                    yesterday++;
                }
                if (d.timestamp) {
                    const tDate = d.timestamp.toDate();
                    if (tDate >= startOfWeek) {
                        weekly++;
                    }
                }
            });

            setYesterdayCount(yesterday);
            setWeeklyTotal(weekly);
        });
    };

    const getFormattedOffsetDate = (offset: number): string => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const handleApprove = async (id: string) => {
        try {
            await db.collection('siwes_logs').doc(id).update({ status: "Approved" });
            fetchMetrics();
        } catch (err: any) {
            alert("Approval error: " + err.message);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await db.collection('siwes_logs').doc(id).update({ status: "Rejected" });
            fetchMetrics();
        } catch (err: any) {
            alert("Rejection error: " + err.message);
        }
    };

    // Filter list
    const filteredLogs = pendingLogs.filter(log => 
        log.studentName.toLowerCase().includes(searchVal.toLowerCase()) ||
        log.email.toLowerCase().includes(searchVal.toLowerCase())
    );

    // Calendar Heatmap rendering helper
    const renderCalendarDays = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        const days: React.ReactNode[] = [];

        // Fillers
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day day-empty"></div>);
        }

        // Days
        for (let day = 1; day <= totalDays; day++) {
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPending = pendingDates.has(dayStr);
            const pendingClass = isPending ? "day-has-pending" : "";

            days.push(
                <div 
                    key={`day-${day}`} 
                    className={`calendar-day ${pendingClass}`} 
                    title={isPending ? 'Contains pending submissions' : 'No pipeline logs for today'}
                >
                    {day}
                </div>
            );
        }

        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthLabel = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

    return (
        <div className="animated-fade-in">
            {/* Metrics */}
            <div className="metrics-grid">
                <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                    <div className="metric-data">
                        <h4>Logs Submitted Yesterday</h4>
                        <p>{yesterdayCount}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-blue)' }}>👤</div>
                </div>
                <div className="metric-card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
                    <div className="metric-data">
                        <h4>Logs Submitted This Week</h4>
                        <p>{weeklyTotal}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-pending)' }}>⏳</div>
                </div>
                <div className="metric-card" style={{ borderLeft: '4px solid var(--status-approved)' }}>
                    <div className="metric-data">
                        <h4>Remaining Verification Queue</h4>
                        <p>{totalPending}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-approved)' }}>✅</div>
                </div>
            </div>

            <div className="supervisor-dashboard-grid">
                {/* Pipeline list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ marginBottom: 0 }}>
                        <h3 className="card-title">📊 Unreviewed Log Pipeline</h3>
                        
                        <div className="filter-row" style={{ padding: '12px', marginBottom: '16px' }}>
                            <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                                <input 
                                    type="text" 
                                    value={searchVal} 
                                    onChange={(e) => setSearchVal(e.target.value)} 
                                    placeholder="Filter queue by student name or email..." 
                                />
                            </div>
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Date</th>
                                        <th>Description of Work</th>
                                        <th>Verification Checkpoint</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                                                No logs currently waiting evaluation.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map(log => (
                                            <tr key={log.id} className="log-pipeline-row" style={{ animation: 'scaleUp 0.3s ease' }}>
                                                <td data-label="Student">
                                                    <b>👤 {log.studentName}</b>
                                                    <br />
                                                    <small style={{ color: '#64748b' }}>{log.email}</small>
                                                </td>
                                                <td data-label="Date" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                    {log.date}
                                                </td>
                                                <td data-label="Description of Work" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {log.activity}
                                                </td>
                                                <td data-label="Verification Checkpoint">
                                                    <a 
                                                        href={`https://maps.google.com/?q=${log.location.lat},${log.location.lng}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 700, display: 'block', marginBottom: '4px' }}
                                                    >
                                                        📍 View Map Location
                                                    </a>
                                                    {log.photoProof && (
                                                        <a 
                                                            href={log.photoProof} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            style={{ fontSize: '11px', color: 'var(--accent-sky)', fontWeight: 600, textDecoration: 'none' }}
                                                        >
                                                            🖼️ Inspect Evidence
                                                        </a>
                                                    )}
                                                </td>
                                                <td data-label="Actions" style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => handleApprove(log.id)} 
                                                        className="btn btn-accent" 
                                                        style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReject(log.id)} 
                                                        className="btn btn-danger" 
                                                        style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="calendar-wrapper" style={{ alignSelf: 'flex-start' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontWeight: 800, color: 'var(--primary-slate)' }}>📅 SIWES Pipeline Calendar</h3>
                        <h4 style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{currentMonthLabel}</h4>
                    </div>
                    
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500, marginBottom: '15px' }}>
                        Dots indicate dates containing student logs pending review.
                    </p>

                    <div className="calendar-header-row">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    
                    <div className="calendar-grid">
                        {renderCalendarDays()}
                    </div>
                </div>
            </div>
        </div>
    );
};
