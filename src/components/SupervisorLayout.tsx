import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './Layout.css';

export const SupervisorLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                const email = user.email ? user.email.toLowerCase() : '';
                if (!email.includes('admin') && !email.includes('supervisor')) {
                    navigate('/student/dashboard');
                }
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
            <nav className="top-navbar" style={{ backgroundColor: 'var(--primary-slate)' }}>
                <div className="brand-section">
                    <button className="menu-btn" onClick={toggleMenu}>☰</button>
                    <h1 className="brand-title">SIWES Supervisor Desk</h1>
                </div>
                <div className="user-badge" style={{ borderColor: 'var(--status-rejected)', color: 'var(--status-rejected)' }}>🛡️ EVALUATOR MODE</div>
            </nav>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <ul className="sidebar-menu">
                    <li className={getSidebarItemClass('/supervisor/dashboard')}>
                        <Link to="/supervisor/dashboard" onClick={() => setSidebarOpen(false)}>📊 Review Pending Logs</Link>
                    </li>
                    <li className={getSidebarItemClass('/supervisor/students')}>
                        <Link to="/supervisor/students" onClick={() => setSidebarOpen(false)}>👥 Supervised Students</Link>
                    </li>
                    <li className={getSidebarItemClass('/supervisor/broadcast')}>
                        <Link to="/supervisor/broadcast" onClick={() => setSidebarOpen(false)}>📤 Message Center</Link>
                    </li>
                    <li className={getSidebarItemClass('/supervisor/history')}>
                        <Link to="/supervisor/history" onClick={() => setSidebarOpen(false)}>📜 Review History Book</Link>
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
