import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './Layout.css';

export const StudentLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userDisplay, setUserDisplay] = useState('Profile...');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                const email = user.email ? user.email.toLowerCase() : '';
                if (email.includes('admin') || email.includes('supervisor')) {
                    navigate('/supervisor/dashboard');
                    return;
                }
                setUserDisplay(`👤 ${user.displayName || user.email}`);
            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            await auth.signOut();
            navigate('/');
        } catch (err: any) {
            alert("Logout failed: " + err.message);
        }
    };

    const toggleMenu = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const getSidebarItemClass = (path: string) => {
        return location.pathname === path ? 'sidebar-item active' : 'sidebar-item';
    };

    return (
        <div>
            <nav className="top-navbar">
                <div className="brand-section">
                    <button className="menu-btn" onClick={toggleMenu}>☰</button>
                    <h1 className="brand-title">SIWES Logbook</h1>
                </div>
                <div className="user-badge">{userDisplay}</div>
            </nav>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <ul className="sidebar-menu">
                    <li className={getSidebarItemClass('/student/dashboard')}>
                        <Link to="/student/dashboard" onClick={() => setSidebarOpen(false)}>📝 Today's Entry</Link>
                    </li>
                    <li className={getSidebarItemClass('/student/history')}>
                        <Link to="/student/history" onClick={() => setSidebarOpen(false)}>📊 View Past Logs</Link>
                    </li>
                    <li className={getSidebarItemClass('/student/messages')}>
                        <Link to="/student/messages" onClick={() => setSidebarOpen(false)}>💬 Message Box</Link>
                    </li>
                    <li className={getSidebarItemClass('/student/settings')}>
                        <Link to="/student/settings" onClick={() => setSidebarOpen(false)}>⚙️ Profile Settings</Link>
                    </li>
                    <li><hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.08)', margin: '15px 0' }} /></li>
                    <li className="sidebar-item">
                        <a href="#" onClick={handleLogout} style={{ color: 'var(--status-rejected)' }}>🚪 Log Out</a>
                    </li>
                </ul>
            </aside>

            <main className={`main-wrapper ${sidebarOpen ? 'shifted' : ''}`}>
                <Outlet />
            </main>
        </div>
    );
};
