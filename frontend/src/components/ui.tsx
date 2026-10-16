import React, { useState } from 'react';
import { initials, toDateStr } from '../lib/dates';
import type { EntryStatus } from '../lib/types';

/* ---------- Icons (stroke icons, 24x24 grid) ---------- */
const ICONS: Record<string, string> = {
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
    calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    check: 'M20 6 9 17l-5-5',
    'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    x: 'M18 6 6 18M6 6l12 12',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
    megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l8 5V5L6 10H4a1 1 0 0 0-1 1zM18 8a5 5 0 0 1 0 8',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    menu: 'M3 12h18M3 6h18M3 18h18',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'eye-off': 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22',
    cap: 'M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    plus: 'M12 5v14M5 12h14',
    building: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01',
    clipboard: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z',
    chevron: 'M9 18l6-6-6-6',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
};

export const Icon: React.FC<{ name: keyof typeof ICONS | string; size?: number }> = ({ name, size = 18 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="icon"
    >
        <path d={ICONS[name] || ''} />
    </svg>
);

/* ---------- Small building blocks ---------- */
export const StatusBadge: React.FC<{ status: EntryStatus | string }> = ({ status }) => {
    const icon = status === 'Approved' ? 'check' : status === 'Rejected' ? 'x' : 'clock';
    return (
        <span className={`badge badge-${String(status).toLowerCase()}`}>
            <Icon name={icon} size={12} />
            {status}
        </span>
    );
};

export const Avatar: React.FC<{ name: string; url?: string | null; size?: number }> = ({ name, url, size = 40 }) => {
    const [broken, setBroken] = useState(false);
    const style = { width: size, height: size, fontSize: size * 0.38 };
    if (url && !broken) {
        return <img className="avatar" style={style} src={url} alt={name} onError={() => setBroken(true)} />;
    }
    return (
        <span className="avatar avatar-initials" style={style}>
            {initials(name)}
        </span>
    );
};

export const Alert: React.FC<{ kind?: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({
    kind = 'info',
    children,
}) => (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
        <Icon name={kind === 'success' ? 'check-circle' : 'alert'} size={16} />
        <div>{children}</div>
    </div>
);

export const Empty: React.FC<{ icon: string; title: string; children?: React.ReactNode }> = ({
    icon,
    title,
    children,
}) => (
    <div className="empty">
        <div className="empty-icon">
            <Icon name={icon} size={24} />
        </div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
    </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({
    title,
    subtitle,
    children,
}) => (
    <header className="page-header">
        <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
        </div>
        {children && <div className="page-actions">{children}</div>}
    </header>
);

export const Stat: React.FC<{ icon: string; tone?: string; label: string; value: React.ReactNode }> = ({
    icon,
    tone = 'brand',
    label,
    value,
}) => (
    <div className="stat">
        <span className={`stat-icon tone-${tone}`}>
            <Icon name={icon} size={20} />
        </span>
        <div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    </div>
);

/* ---------- Month calendar ---------- */
export type DayMark = 'Approved' | 'Pending' | 'Rejected';

export const MonthCalendar: React.FC<{ marks: Record<string, DayMark>; onPick?: (date: string) => void }> = ({
    marks,
    onPick,
}) => {
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const lead = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const todayKey = toDateStr(new Date());

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < lead; i++) cells.push(<span key={`e${i}`} className="cal-day cal-empty" />);
    for (let day = 1; day <= total; day++) {
        const key = toDateStr(new Date(year, month, day));
        const mark = marks[key];
        const cls = ['cal-day', mark ? `cal-${mark.toLowerCase()}` : '', key === todayKey ? 'cal-today' : '']
            .filter(Boolean)
            .join(' ');
        cells.push(
            onPick ? (
                <button type="button" key={key} className={cls} title={mark || 'No entry'} onClick={() => onPick(key)}>
                    {day}
                </button>
            ) : (
                <span key={key} className={cls} title={mark || 'No entry'}>
                    {day}
                </span>
            ),
        );
    }

    return (
        <div className="calendar">
            <div className="cal-head">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
                    <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
                        <Icon name="chevron" size={16} />
                    </span>
                </button>
                <strong>{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
                    <Icon name="chevron" size={16} />
                </button>
            </div>
            <div className="cal-grid cal-weekdays">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i}>{d}</span>
                ))}
            </div>
            <div className="cal-grid">{cells}</div>
            <div className="cal-legend">
                <span><i className="dot cal-approved" /> Approved</span>
                <span><i className="dot cal-pending" /> Pending</span>
                <span><i className="dot cal-rejected" /> Rejected</span>
            </div>
        </div>
    );
};
