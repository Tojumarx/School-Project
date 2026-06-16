import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import firebase from 'firebase/compat/app';
import './History.css';

interface LogArchiveEntry {
    id: string;
    studentName: string;
    email: string;
    date: string;
    activity: string;
    status: string;
    timestamp?: firebase.firestore.Timestamp;
}

export const SupervisorHistory: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [archiveLogs, setArchiveLogs] = useState<LogArchiveEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasSearched, setHasSearched] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (!user) {
                // Not authenticated
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const runArchiveSearch = async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            let query: firebase.firestore.Query = db.collection('siwes_logs');
            
            if (startDate && endDate) {
                const sTS = firebase.firestore.Timestamp.fromDate(new Date(startDate));
                const eObj = new Date(endDate);
                eObj.setHours(23, 59, 59);
                const eTS = firebase.firestore.Timestamp.fromDate(eObj);
                
                query = query.where("timestamp", ">=", sTS).where("timestamp", "<=", eTS);
            }

            const snapshot = await query.orderBy("timestamp", "desc").get();
            const list: LogArchiveEntry[] = [];
            const term = searchTerm.toLowerCase().trim();

            snapshot.forEach((doc: any) => {
                const d = doc.data();
                
                // Match search term locally
                const nameMatch = d.studentName ? d.studentName.toLowerCase().includes(term) : false;
                const emailMatch = d.email ? d.email.toLowerCase().includes(term) : false;

                if (term === "" || nameMatch || emailMatch) {
                    list.push({
                        id: doc.id,
                        studentName: d.studentName || 'Student',
                        email: d.email || '',
                        date: d.date || '',
                        activity: d.activity || '',
                        status: d.status || 'Pending',
                        timestamp: d.timestamp
                    });
                }
            });

            setArchiveLogs(list);
        } catch (err: any) {
            alert("Search pattern requires Firestore indexing if sorting with date bounds. Make sure your indexes are built.");
            console.error(err);
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
