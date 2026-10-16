import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import { Avatar, Icon } from './ui';

interface NavItem {
    to: string;
    label: string;
    icon: string;
    badge?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
    student: [
        { to: '/student/dashboard', label: "Today's Log", icon: 'book' },
        { to: '/student/history', label: 'My Logbook', icon: 'history' },
        { to: '/student/messages', label: 'Supervisor Chat', icon: 'message', badge: true },
        { to: '/student/settings', label: 'My Profile', icon: 'settings' },
    ],
    supervisor: [
        { to: '/supervisor/dashboard', label: 'Review Queue', icon: 'clipboard' },
        { to: '/supervisor/students', label: 'My Students', icon: 'users' },
        { to: '/supervisor/messages', label: 'Messages', icon: 'message', badge: true },
        { to: '/supervisor/history', label: 'Logbook Archive', icon: 'history' },
    ],
};

const POLL_MS = 10000;

export const AppShell: React.FC<{ role: Role }> = ({ role }) => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);

    // Close the mobile drawer on navigation
    useEffect(() => setOpen(false), [location.pathname]);

    // Keep the unread badge fresh
    useEffect(() => {
        let alive = true;
        const load = () =>
            api<{ count: number }>('/messages/unread-count')
                .then((r) => alive && setUnread(r.count))
                .catch(() => undefined);
        load();
        const timer = setInterval(load, POLL_MS);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [location.pathname]);

    const handleLogout = async () => {
        await signOut();
        navigate('/', { replace: true });
    };

    const displayName = profile ? `${role === 'supervisor' && profile.title ? profile.title + ' ' : ''}${profile.full_name}` : '';

    return (
        <div className={`app theme-${role}`}>
            <div className="topbar">
                <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
                    <Icon name="menu" size={22} />
                </button>
                <strong>SIWES Logbook</strong>
                <Avatar name={profile?.full_name || '?'} url={profile?.avatar_url} size={32} />
            </div>

            {open && <div className="scrim" onClick={() => setOpen(false)} />}

            <aside className={`sidebar ${open ? 'open' : ''}`}>
                <div className="brand">
                    <span className="brand-mark">
                        <Icon name="cap" size={20} />
                    </span>
                    <div>
                        <strong>SIWES Logbook</strong>
                        <small>{role === 'supervisor' ? 'Supervisor Desk' : 'Student Portal'}</small>
                    </div>
                </div>

                <nav className="nav">
                    {NAV[role].map((item) => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                            <Icon name={item.icon} />
                            <span>{item.label}</span>
                            {item.badge && unread > 0 && <span className="nav-badge">{unread}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    <div className="who">
                        <Avatar name={profile?.full_name || '?'} url={profile?.avatar_url} size={38} />
                        <div className="who-text">
                            <strong>{displayName}</strong>
                            <small>{profile?.email}</small>
                        </div>
                    </div>
                    <button className="nav-link nav-logout" onClick={handleLogout}>
                        <Icon name="logout" />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>

            <main className="main">
                <Outlet />
            </main>
        </div>
    );
};
