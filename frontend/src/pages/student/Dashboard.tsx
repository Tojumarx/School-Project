import React, { useState, useEffect } from 'react';
import { supabase, BACKEND_URL } from '../../supabaseClient';
import './Dashboard.css';

interface StudentProfile {
    fullName: string;
    email: string;
    gender?: string;
    dob?: string;
    avatar?: string;
}

export const StudentDashboard: React.FC = () => {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [yesterdayStatus, setYesterdayStatus] = useState<string>('Loading...');
    const [yesterdayClass, setYesterdayClass] = useState<string>('status-Rejected');
    const [weeklyCount, setWeeklyCount] = useState<number>(0);
    const [unverifiedCount, setUnverifiedCount] = useState<number>(0);
    
    // Form States
    const [logDate, setLogDate] = useState<string>('');
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [activity, setActivity] = useState<string>('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Heatmap Maps
    const [loggedDatesMap, setLoggedDatesMap] = useState<Record<string, string>>({});

    useEffect(() => {
        // Geolocation hook
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setLat(pos.coords.latitude);
                    setLng(pos.coords.longitude);
                },
                err => console.warn("GPS Location block unavailable: ", err),
                { enableHighAccuracy: true }
            );
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const user = session.user;
                const email = user.email!;

                setProfile({
                    fullName: user.user_metadata?.full_name || email.split('@')[0],
                    email: email,
                    gender: user.user_metadata?.gender,
                    dob: user.user_metadata?.dob,
                    avatar: user.user_metadata?.avatar_url
                });

                // Fetch entries from NestJS Backend
                fetch(`${BACKEND_URL}/api/entries?studentEmail=${encodeURIComponent(email)}`)
                    .then(res => res.json())
                    .then(entries => {
                        const tempMap: Record<string, string> = {};
                        let unverified = 0;
                        let thisWeek = 0;
                        let yStatus = "No Log Filed";
                        let yClass = "status-Rejected";

                        const yesterdayStr = getFormattedOffsetDate(-1);
                        const startOfWeek = new Date();
                        const today = new Date();
                        startOfWeek.setDate(today.getDate() - today.getDay());
                        startOfWeek.setHours(0, 0, 0, 0);

                        entries.forEach((e: any) => {
                            if (e.date) {
                                tempMap[e.date] = e.status;

                                if (e.date === yesterdayStr) {
                                    yStatus = e.status;
                                    yClass = `status-${e.status}`;
                                }
                            }
                            if (e.status === "Pending" || e.status === "pending") unverified++;

                            if (e.created_at) {
                                const tDate = new Date(e.created_at);
                                if (tDate >= startOfWeek) {
                                    thisWeek++;
                                }
                            }
                        });

                        setLoggedDatesMap(tempMap);
                        setYesterdayStatus(yStatus);
                        setYesterdayClass(yClass);
                        setWeeklyCount(thisWeek);
                        setUnverifiedCount(unverified);
                    })
                    .catch(err => console.error("Error fetching logs: ", err));
            }
        });
    }, []);

    const getFormattedOffsetDate = (offset: number): string => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const session = (await supabase.auth.getSession()).data.session;
        if (!session?.user) return;

        if (lat === null || lng === null) {
            alert("Please allow location tracking access to verify this log.");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_email: session.user.email,
                    student_name: profile?.fullName || session.user.email,
                    date: logDate,
                    description: activity.trim(),
                    image_url: photoUrl.trim(),
                    location: { latitude: lat, longitude: lng },
                    status: "Pending"
                })
            });

            if (!response.ok) throw new Error("Failed to save entry");

            alert("Log saved successfully!");
            setLogDate('');
            setPhotoUrl('');
            setActivity('');
            window.location.reload();
        } catch (err: any) {
            alert("Submission error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

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
            const logStatus = loggedDatesMap[dayStr];
            let statusClass = "";

            if (logStatus) {
                statusClass = `day-logged-${logStatus}`;
            }

            days.push(
                <div 
                    key={`day-${day}`} 
                    className={`calendar-day ${statusClass}`} 
                    title={logStatus ? `Status: ${logStatus}` : 'No Entry Submitted'}
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
            {/* Student Profile Overview Card */}
            <div className="card" style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-sky)', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#64748b' }}>
                    {profile?.avatar ? (
                        <img 
                            src={profile.avatar} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150/f1f5f9/64748b?text=Student' }} 
                            alt="Student avatar" 
                        />
                    ) : (
                        "👤"
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {profile ? profile.fullName : "Loading Student Details..."}
                    </h2>
                    <p style={{ color: '#64748b', fontWeight: 500, fontSize: '0.95rem' }}>
                        {profile ? profile.email : "Checking registration info..."}
                    </p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {profile?.gender && (
                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>
                                Gender: {profile.gender}
                            </span>
                        )}
                        {profile?.dob && (
                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>
                                DOB: {profile.dob}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
                <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                    <div className="metric-data">
                        <h4>Yesterday's Entry</h4>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
                            <span className={`status-badge ${yesterdayClass}`}>{yesterdayStatus}</span>
                        </div>
                    </div>
                    <div className="metric-icon" style={{ background: '#f1f5f9' }}>🕒</div>
                </div>
                <div className="metric-card" style={{ borderLeft: '4px solid var(--status-approved)' }}>
                    <div className="metric-data">
                        <h4>Logged This Week</h4>
                        <p>{weeklyCount}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-approved)' }}>📅</div>
                </div>
                <div className="metric-card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
                    <div className="metric-data">
                        <h4>Unverified Pipeline</h4>
                        <p>{unverifiedCount}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-pending)' }}>⏳</div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Left Workspace: Entry Form Panel */}
                <div className="card">
                    <h3 className="card-title">📝 Daily Log Submission</h3>
                    <form onSubmit={handleFormSubmit}>
                        <div className="form-group">
                            <label>Select Work Date</label>
                            <input 
                                type="date" 
                                value={logDate} 
                                onChange={(e) => setLogDate(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Attachment URL Link (Proof)</label>
                            <input 
                                type="text" 
                                value={photoUrl} 
                                onChange={(e) => setPhotoUrl(e.target.value)} 
                                placeholder="Paste ImgBB link or hosted screenshot" 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>Activity Summary & Work Done</label>
                            <textarea 
                                value={activity} 
                                onChange={(e) => setActivity(e.target.value)} 
                                rows={6} 
                                placeholder="Document specific tasks, setups configured, or logic developed today..." 
                                required 
                            ></textarea>
                        </div>
                        
                        <button type="submit" className="btn btn-accent" disabled={submitting}>
                            {submitting ? 'Saving Log Entry...' : 'Save Log Entry'}
                        </button>
                    </form>
                </div>

                {/* Right Workspace: Visual Calendar Heatmap Panel */}
                <div className="calendar-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontWeight: 800, color: 'var(--primary-slate)' }}>📅 Calendar Activity Heatmap</h3>
                        <h4 style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{currentMonthLabel}</h4>
                    </div>
                    
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
