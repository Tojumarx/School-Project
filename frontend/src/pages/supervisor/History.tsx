import React, { useState } from 'react';
import { BACKEND_URL } from '../../supabaseClient';
import './History.css';

interface LogArchiveEntry {
    id: string;
    studentName: string;
    email: string;
    date: string;
    activity: string;
    status: string;
}

export const SupervisorHistory: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [archiveLogs, setArchiveLogs] = useState<LogArchiveEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);

    const runArchiveSearch = async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/entries`);
            const data = await res.json();
            const term = searchTerm.toLowerCase().trim();

            let list: LogArchiveEntry[] = data.map((d: any) => ({
                id: d.id,
                studentName: d.student_name || 'Student',
                email: d.student_email || '',
                date: d.date || '',
                activity: d.description || '',
                status: d.status || 'Pending'
            }));

            if (startDate && endDate) {
                list = list.filter(item => item.date >= startDate && item.date <= endDate);
            }

            if (term) {
                list = list.filter(item => 
                    item.studentName.toLowerCase().includes(term) ||
                    item.email.toLowerCase().includes(term)
                );
            }

            setArchiveLogs(list);
        } catch (err: any) {
            console.error("Failed to query log archives: ", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card animated-fade-in">
            <h3 className="card-title">📜 Filter Student Log Archives</h3>
            
            <div className="filter-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <label>Filter by Student Name or Email</label>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Search student name or email..." 
                    />
                </div>
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
                <button 
                    onClick={runArchiveSearch} 
                    className="btn btn-primary" 
                    style={{ height: '46px', width: 'auto', alignSelf: 'flex-end' }}
                >
                    Search Archives
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Date</th>
                            <th>Work Done</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                    Querying archives...
                                </td>
                            </tr>
                        ) : archiveLogs.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                    {hasSearched ? 'No matching records found.' : 'Execute a search using the parameters above.'}
                                </td>
                            </tr>
                        ) : (
                            archiveLogs.map(log => (
                                <tr key={log.id} style={{ animation: 'scaleUp 0.3s ease' }}>
                                    <td data-label="Student">
                                        <b>👤 {log.studentName}</b>
                                        <br />
                                        <small style={{ color: '#64748b' }}>{log.email}</small>
                                    </td>
                                    <td data-label="Date" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                        {log.date}
                                    </td>
                                    <td data-label="Work Done" style={{ whiteSpace: 'pre-wrap' }}>
                                        {log.activity}
                                    </td>
                                    <td data-label="Status">
                                        <span className={`status-badge status-${log.status}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
