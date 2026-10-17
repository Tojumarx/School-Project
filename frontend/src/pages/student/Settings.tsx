import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { SupervisorSummary } from '../../lib/types';
import { Alert, Avatar, PageHeader } from '../../components/ui';

export const StudentSettings: React.FC = () => {
    const { profile, refresh } = useAuth();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [gender, setGender] = useState(profile?.gender || 'Male');
    const [dob, setDob] = useState(profile?.dob || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [studentId, setStudentId] = useState(profile?.student_id || '');
    const [course, setCourse] = useState(profile?.course || '');
    const [level, setLevel] = useState(profile?.level || '400');
    const [supervisorId, setSupervisorId] = useState(profile?.supervisor_id ? String(profile.supervisor_id) : '');
    const [supervisors, setSupervisors] = useState<SupervisorSummary[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        api<SupervisorSummary[]>('/supervisors').then(setSupervisors).catch(() => setSupervisors([]));
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            await api('/profile', {
                method: 'PUT',
                body: {
                    full_name: fullName,
                    gender,
                    dob,
                    avatar_url: avatarUrl,
                    student_id: studentId,
                    course,
                    level,
                    supervisor_id: supervisorId ? Number(supervisorId) : null,
                },
            });
            await refresh();
            setSuccess('Profile saved.');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageHeader title="My profile" subtitle="Keep your details and supervisor up to date." />

            <section className="card narrow">
                <div className="person profile-head">
                    <Avatar name={fullName || profile?.full_name || '?'} url={avatarUrl} size={64} />
                    <div className="person-text">
                        <strong>{fullName || profile?.full_name}</strong>
                        <small>{profile?.email}</small>
                        {profile?.institution && <small>{profile.institution}</small>}
                    </div>
                </div>

                {error && <Alert kind="error">{error}</Alert>}
                {success && <Alert kind="success">{success}</Alert>}

                <form onSubmit={save} className="stack">
                    <div className="field">
                        <label htmlFor="n">Full name</label>
                        <input id="n" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>

                    <div className="row2">
                        <div className="field">
                            <label htmlFor="mat">Matric number</label>
                            <input id="mat" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                        </div>
                        <div className="field">
                            <label htmlFor="course">Course of study</label>
                            <input id="course" value={course} onChange={(e) => setCourse(e.target.value)} />
                        </div>
                    </div>

                    <div className="row3">
                        <div className="field">
                            <label htmlFor="level">Level</label>
                            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
                                {['200', '300', '400', '500'].map((l) => (
                                    <option key={l} value={l}>{l} Level</option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="g">Gender</label>
                            <select id="g" value={gender} onChange={(e) => setGender(e.target.value)}>
                                <option>Male</option>
                                <option>Female</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="dob">Date of birth</label>
                            <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor="sup">SIWES supervisor</label>
                        <select id="sup" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                            <option value="">Not assigned</option>
                            {supervisors.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {[s.title, s.full_name].filter(Boolean).join(' ')}
                                    {s.department ? ` — ${s.department}` : ''}
                                </option>
                            ))}
                        </select>
                        <span className="hint">Your supervisor reviews your logs and can message you.</span>
                    </div>

                    <div className="field">
                        <label htmlFor="av">
                            Profile picture link <span className="optional">optional</span>
                        </label>
                        <input id="av" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
                    </div>

                    <div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </section>
        </>
    );
};
