const pad = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayStr = () => toDateStr(new Date());

export const offsetDateStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return toDateStr(d);
};

export const startOfWeekStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return toDateStr(d);
};

/** "Mon, 12 Oct 2026" from a YYYY-MM-DD string (parsed as local time). */
export const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const formatTime = (iso: string) => {
    const d = new Date(iso);
    const sameDay = toDateStr(d) === todayStr();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return sameDay ? time : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
};

export const initials = (name: string) =>
    name
        .replace(/^(dr|prof|mr|mrs|engr)\.?\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('') || '?';
