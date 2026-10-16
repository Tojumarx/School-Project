import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../lib/auth';
import { formatDate, startOfWeekStr, todayStr } from '../../lib/dates';
import type { Entry } from '../../lib/types';
import { Alert, Avatar, Icon, MonthCalendar, Stat, StatusBadge, type DayMark } from '../../components/ui';
import banner from '../../assets/student-banner.jpg';

const PHOTO_BUCKET = 'log-photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type GeoState = 'locating' | 'ok' | 'denied' | 'unsupported';

interface Prefill {
    date?: string;
    description?: string;
    image_url?: string | null;
}

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const StudentDashboard: React.FC = () => {
    const { profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const prefill = (location.state as Prefill | null) || null;

    const [entries, setEntries] = useState<Entry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);

    const [date, setDate] = useState(prefill?.date || todayStr());
    const [description, setDescription] = useState(prefill?.description || '');
    const [imageUrl, setImageUrl] = useState(prefill?.image_url || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [geo, setGeo] = useState<GeoState>('locating');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadEntries = useCallback(async () => {
        try {
            setEntries(await api<Entry[]>('/entries'));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoadingEntries(false);
        }
    }, []);

    const locate = useCallback(() => {
        if (!navigator.geolocation) {
            setGeo('unsupported');
            return;
        }
        setGeo('locating');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGeo('ok');
            },
            () => setGeo('denied'),
            { enableHighAccuracy: true, timeout: 15000 },
        );
    }, []);

    useEffect(() => {
        loadEntries();
        locate();
    }, [loadEntries, locate]);

    // Drop the router state so a refresh doesn't re-apply an old prefill
    useEffect(() => {
        if (prefill) navigate(location.pathname, { replace: true, state: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!photoFile) {
            setPhotoPreview('');
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!PHOTO_TYPES.includes(file.type)) {
            setError('Photos must be JPG, PNG or WebP images.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setError('That photo is larger than 5 MB. Choose a smaller one.');
            return;
        }
        setError('');
        setPhotoFile(file);
    };

    const removePhoto = () => {
        setPhotoFile(null);
        setImageUrl('');
    };

    const uploadPhoto = async (file: File): Promise<string> => {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error('Your session expired. Please sign in again.');
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${data.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
        return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
    };

    const stats = useMemo(() => {
        const weekStart = startOfWeekStr();
        return {
            week: entries.filter((e) => e.date >= weekStart).length,
            pending: entries.filter((e) => e.status === 'Pending').length,
            approved: entries.filter((e) => e.status === 'Approved').length,
            total: entries.length,
        };
    }, [entries]);

    const rejected = entries.filter((e) => e.status === 'Rejected');
    const marks = useMemo(() => {
        const m: Record<string, DayMark> = {};
        entries.forEach((e) => (m[e.date] = e.status));
        return m;
    }, [entries]);

    const existingForDate = entries.find((e) => e.date === date);
    const blocked = !!existingForDate && existingForDate.status !== 'Rejected';
    const resubmitting = existingForDate?.status === 'Rejected';

    const startFix = (e: Entry) => {
        setDate(e.date);
        setDescription(e.description);
        setImageUrl(e.image_url || '');
        setSuccess('');
        setError('');
        document.getElementById('log-form')?.scrollIntoView();
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setError('');
        setSuccess('');

        if (!coords) {
            setError('Location is required to verify your log. Allow location access in your browser, then tap "Try again".');
            return;
        }

        setSubmitting(true);
        try {
            const finalImage = photoFile ? await uploadPhoto(photoFile) : imageUrl.trim() || null;
            await api('/entries', {
                method: 'POST',
                body: {
                    date,
                    description: description.trim(),
                    image_url: finalImage,
                    latitude: coords.lat,
                    longitude: coords.lng,
                },
            });
            setSuccess(resubmitting ? 'Corrected log resubmitted for review.' : 'Log saved and sent to your supervisor for review.');
            setDescription('');
            setImageUrl('');
            setPhotoFile(null);
            setDate(todayStr());
            await loadEntries();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const supervisor = profile?.supervisor;

    return (
        <>
            <section className="banner" style={{ backgroundImage: `url(${banner})` }}>
                <div className="banner-text">
                    <small>{formatDate(todayStr())}</small>
                    <h1>
                        {greeting()}, {profile?.full_name.split(' ')[0]}
                    </h1>
                    <p>
                        {[profile?.course, profile?.level ? `${profile.level} Level` : null, profile?.institution]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>
            </section>

            <div className="stats">
                <Stat icon="calendar" tone="brand" label="Logged this week" value={stats.week} />
                <Stat icon="clock" tone="amber" label="Awaiting review" value={stats.pending} />
                <Stat icon="check-circle" tone="green" label="Approved" value={stats.approved} />
                <Stat icon="book" tone="slate" label="Total logs" value={stats.total} />
            </div>

            {rejected.length > 0 && (
                <section className="card attention">
                    <div className="card-head">
                        <h2>
                            <Icon name="alert" /> Needs your attention
                        </h2>
                        <span className="muted">{rejected.length} rejected</span>
                    </div>
                    <ul className="plain-list">
                        {rejected.map((e) => (
                            <li key={e.id} className="attention-item">
                                <div>
                                    <strong>{formatDate(e.date)}</strong>
                                    <p className="feedback">
                                        <Icon name="message" size={14} /> {e.supervisor_comment || 'No comment left.'}
                                    </p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={() => startFix(e)}>
                                    Fix and resubmit
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="layout-2">
                <section className="card" id="log-form">
                    <div className="card-head">
                        <h2>{resubmitting ? 'Resubmit corrected log' : 'Log your work'}</h2>
                    </div>

                    {!loadingEntries && !profile?.supervisor_id && (
                        <Alert kind="info">
                            You haven't chosen a supervisor yet, so nobody can review your logs. <Link to="/student/settings">Choose one in My Profile</Link>.
                        </Alert>
                    )}
                    {error && <Alert kind="error">{error}</Alert>}
                    {success && <Alert kind="success">{success}</Alert>}

                    <form onSubmit={handleSubmit} className="stack">
                        <div className="field">
                            <label htmlFor="date">Work date</label>
                            <input id="date" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} required />
                            {blocked && (
                                <span className="hint warn">
                                    You already logged this date ({existingForDate?.status.toLowerCase()}). Pick a different date.
                                </span>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="activity">What did you do?</label>
                            <textarea
                                id="activity"
                                rows={7}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                minLength={10}
                                placeholder="Describe the tasks you handled, tools you used and what you learned today."
                            />
                            <span className="hint">{description.trim().length} characters · minimum 10</span>
                        </div>

                        <div className="field">
                            <label htmlFor="proof">
                                Photo of your work <span className="optional">optional</span>
                            </label>
                            {photoPreview || imageUrl ? (
                                <div className="photo-preview">
                                    <img src={photoPreview || imageUrl} alt="Selected work" />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={removePhoto}>
                                        <Icon name="x" size={14} /> Remove
                                    </button>
                                </div>
                            ) : (
                                <label htmlFor="proof" className="photo-drop">
                                    <Icon name="image" size={22} />
                                    <span>Choose a photo</span>
                                    <small>JPG, PNG or WebP, up to 5 MB</small>
                                </label>
                            )}
                            <input id="proof" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} className="visually-hidden" />
                        </div>

                        <div className={`geo geo-${geo}`}>
                            <Icon name="pin" />
                            <div className="geo-text">
                                {geo === 'locating' && <span>Finding your location…</span>}
                                {geo === 'ok' && coords && (
                                    <span>
                                        Location captured <small>({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</small>
                                    </span>
                                )}
                                {geo === 'denied' && <span>Location blocked. Allow access in your browser settings.</span>}
                                {geo === 'unsupported' && <span>This browser can't share location.</span>}
                            </div>
                            {geo !== 'ok' && geo !== 'locating' && (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={locate}>
                                    <Icon name="refresh" size={14} /> Try again
                                </button>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={submitting || blocked}>
                            {submitting ? 'Saving…' : resubmitting ? 'Resubmit for review' : 'Submit log for review'}
                        </button>
                    </form>
                </section>

                <aside className="side-stack">
                    <section className="card">
                        <div className="card-head">
                            <h2>Your calendar</h2>
                        </div>
                        <MonthCalendar marks={marks} onPick={(d) => d <= todayStr() && setDate(d)} />
                    </section>

                    <section className="card">
                        <div className="card-head">
                            <h2>Your supervisor</h2>
                        </div>
                        {supervisor ? (
                            <div className="person">
                                <Avatar name={supervisor.full_name} size={48} />
                                <div className="person-text">
                                    <strong>{[supervisor.title, supervisor.full_name].filter(Boolean).join(' ')}</strong>
                                    <small>{supervisor.department || supervisor.email}</small>
                                    {supervisor.office_loc && <small>Office: {supervisor.office_loc}</small>}
                                </div>
                                <Link to="/student/messages" className="btn btn-secondary btn-sm">
                                    <Icon name="message" size={14} /> Message
                                </Link>
                            </div>
                        ) : (
                            <p className="muted">
                                No supervisor assigned. <Link to="/student/settings">Choose one</Link>.
                            </p>
                        )}
                    </section>

                    {entries.length > 0 && (
                        <section className="card">
                            <div className="card-head">
                                <h2>Recent logs</h2>
                                <Link to="/student/history" className="link-sm">View all</Link>
                            </div>
                            <ul className="plain-list">
                                {entries.slice(0, 4).map((e) => (
                                    <li key={e.id} className="recent-item">
                                        <span>{formatDate(e.date)}</span>
                                        <StatusBadge status={e.status} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </aside>
            </div>
        </>
    );
};
