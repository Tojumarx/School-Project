import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { api, errorMessage } from '../lib/api';
import { portalFor, useAuth } from '../lib/auth';
import type { Role, SupervisorSummary } from '../lib/types';
import { Alert, Icon } from '../components/ui';
import coverImg from '../assets/login-cover.jpg';
import institutionList from '../data/institutions.json';

const DEPARTMENTS = [
    'Computer Science',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering',
    'Petroleum Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Accounting & Finance',
    'Business Administration',
    'Mass Communication',
    'Economics',
    'Microbiology & Biotechnology',
    'Biochemistry',
    'Architecture',
    'Law',
    'Medicine & Surgery',
    'Nursing Science',
    'Mathematics & Statistics',
    'Physics & Geophysics',
    'Chemistry & Industrial Chemistry',
    'Political Science & Public Administration',
];
const OTHER = '__other__';

const PasswordInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    autoComplete: string;
    placeholder?: string;
}> = ({ value, onChange, autoComplete, placeholder }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="input-with-action">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                minLength={6}
                autoComplete={autoComplete}
                placeholder={placeholder || 'At least 6 characters'}
            />
            <button type="button" className="input-action" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                <Icon name={show ? 'eye-off' : 'eye'} />
            </button>
        </div>
    );
};

export const Login: React.FC = () => {
    const { profile, loading: authLoading, refresh } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<Role>('student');

    const [institution, setInstitution] = useState('Federal University of Petroleum Resources Effurun');
    const [dept, setDept] = useState(DEPARTMENTS[0]);
    const [customDept, setCustomDept] = useState('');

    const [studentId, setStudentId] = useState('');
    const [course, setCourse] = useState('');
    const [level, setLevel] = useState('400');
    const [gender, setGender] = useState('Male');
    const [supervisorId, setSupervisorId] = useState('');
    const [supervisors, setSupervisors] = useState<SupervisorSummary[]>([]);

    const [title, setTitle] = useState('Dr.');
    const [officeLoc, setOfficeLoc] = useState('');

    useEffect(() => {
        if (mode !== 'SIGNUP' || role !== 'student') return;
        api<SupervisorSummary[]>('/supervisors')
            .then(setSupervisors)
            .catch(() => setSupervisors([]));
    }, [mode, role]);

    if (!authLoading && profile) return <Navigate to={portalFor(profile.role)} replace />;

    const switchMode = (next: 'LOGIN' | 'SIGNUP') => {
        setMode(next);
        setError('');
    };

    const signInAndEnter = async () => {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
            throw new Error(
                authError.message === 'Invalid login credentials' ? 'Incorrect email or password.' : authError.message,
            );
        }
        const me = await refresh();
        if (!me) throw new Error('Signed in, but your profile could not be loaded. Is the backend running?');
        navigate(portalFor(me.role), { replace: true });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await signInAndEnter();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const department = dept === OTHER ? customDept.trim() : dept;
            await api('/auth/register', {
                method: 'POST',
                body: {
                    email: email.trim(),
                    password,
                    full_name: fullName.trim(),
                    role,
                    department,
                    institution: institution.trim(),
                    ...(role === 'student'
                        ? {
                              student_id: studentId.trim(),
                              course: course.trim() || department,
                              level,
                              gender,
                              supervisor_id: supervisorId ? Number(supervisorId) : null,
                          }
                        : { title, office_loc: officeLoc.trim() }),
                },
            });
            await signInAndEnter();
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    return (
        <div className="auth">
            <section className="auth-panel">
                <div className="auth-box">
                    <div className="brand brand-light">
                        <span className="brand-mark">
                            <Icon name="cap" size={20} />
                        </span>
                        <div>
                            <strong>SIWES Logbook</strong>
                            <small>Industrial training, documented</small>
                        </div>
                    </div>

                    <h1>{mode === 'LOGIN' ? 'Welcome back' : 'Create your account'}</h1>
                    <p className="muted">
                        {mode === 'LOGIN'
                            ? 'Sign in as a student or supervisor to continue.'
                            : 'Students log their daily work. Supervisors review and guide.'}
                    </p>

                    <div className="segmented" role="tablist">
                        <button type="button" role="tab" aria-selected={mode === 'LOGIN'} className={mode === 'LOGIN' ? 'on' : ''} onClick={() => switchMode('LOGIN')}>
                            Sign in
                        </button>
                        <button type="button" role="tab" aria-selected={mode === 'SIGNUP'} className={mode === 'SIGNUP' ? 'on' : ''} onClick={() => switchMode('SIGNUP')}>
                            Create account
                        </button>
                    </div>

                    {error && <Alert kind="error">{error}</Alert>}

                    {mode === 'LOGIN' ? (
                        <form onSubmit={handleLogin} className="stack">
                            <div className="field">
                                <label htmlFor="email">Email address</label>
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@institution.edu.ng" />
                            </div>
                            <div className="field">
                                <label htmlFor="password">Password</label>
                                <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" placeholder="Your password" />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                                {busy ? 'Signing in…' : 'Sign in'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignup} className="stack">
                            <div className="role-pick">
                                <button type="button" className={`role-card ${role === 'student' ? 'on' : ''}`} onClick={() => setRole('student')}>
                                    <Icon name="cap" size={22} />
                                    <strong>Student</strong>
                                    <small>Log daily work</small>
                                </button>
                                <button type="button" className={`role-card ${role === 'supervisor' ? 'on' : ''}`} onClick={() => setRole('supervisor')}>
                                    <Icon name="users" size={22} />
                                    <strong>Supervisor</strong>
                                    <small>Review logbooks</small>
                                </button>
                            </div>

                            <div className="field">
                                <label htmlFor="name">Full name</label>
                                <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" placeholder="e.g. Ada Okafor" />
                            </div>
                            <div className="field">
                                <label htmlFor="email2">Email address</label>
                                <input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@institution.edu.ng" />
                            </div>
                            <div className="field">
                                <label htmlFor="password2">Password</label>
                                <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                            </div>

                            <div className="field">
                                <label htmlFor="inst">Institution</label>
                                <input id="inst" list="institutions" value={institution} onChange={(e) => setInstitution(e.target.value)} required placeholder="Search or type your institution" />
                                <datalist id="institutions">
                                    {(institutionList as string[]).map((i) => (
                                        <option key={i} value={i} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="field">
                                <label htmlFor="dept">Department</label>
                                <select id="dept" value={dept} onChange={(e) => setDept(e.target.value)}>
                                    {DEPARTMENTS.map((d) => (
                                        <option key={d}>{d}</option>
                                    ))}
                                    <option value={OTHER}>Other…</option>
                                </select>
                                {dept === OTHER && (
                                    <input value={customDept} onChange={(e) => setCustomDept(e.target.value)} required placeholder="Type your department" className="mt" />
                                )}
                            </div>

                            {role === 'student' ? (
                                <>
                                    <div className="row2">
                                        <div className="field">
                                            <label htmlFor="mat">Matric number</label>
                                            <input id="mat" value={studentId} onChange={(e) => setStudentId(e.target.value)} required placeholder="CPN/2020/1042" />
                                        </div>
                                        <div className="field">
                                            <label htmlFor="course">Course of study</label>
                                            <input id="course" value={course} onChange={(e) => setCourse(e.target.value)} required placeholder="Software Engineering" />
                                        </div>
                                    </div>
                                    <div className="row2">
                                        <div className="field">
                                            <label htmlFor="level">Level</label>
                                            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
                                                <option value="200">200 Level</option>
                                                <option value="300">300 Level</option>
                                                <option value="400">400 Level</option>
                                                <option value="500">500 Level</option>
                                            </select>
                                        </div>
                                        <div className="field">
                                            <label htmlFor="gender">Gender</label>
                                            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                                                <option>Male</option>
                                                <option>Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label htmlFor="sup">Your SIWES supervisor</label>
                                        <select id="sup" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                                            <option value="">Choose later in My Profile</option>
                                            {supervisors.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {[s.title, s.full_name].filter(Boolean).join(' ')}
                                                    {s.department ? ` — ${s.department}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {supervisors.length === 0 && (
                                            <span className="hint">No supervisors have registered yet. You can pick one later.</span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="row2">
                                    <div className="field">
                                        <label htmlFor="title">Title</label>
                                        <select id="title" value={title} onChange={(e) => setTitle(e.target.value)}>
                                            {['Dr.', 'Prof.', 'Engr.', 'Mr.', 'Mrs.', 'Ms.'].map((t) => (
                                                <option key={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label htmlFor="office">Office location</label>
                                        <input id="office" value={officeLoc} onChange={(e) => setOfficeLoc(e.target.value)} placeholder="Block B, Room 204" />
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                                {busy ? 'Creating account…' : 'Create account'}
                            </button>
                        </form>
                    )}
                </div>
            </section>

            <section className="auth-hero" style={{ backgroundImage: `url(${coverImg})` }}>
                <div className="auth-hero-text">
                    <h2>Every day of your training, on the record.</h2>
                    <ul>
                        <li><Icon name="pin" /> GPS-stamped daily entries</li>
                        <li><Icon name="check-circle" /> Supervisor review and feedback</li>
                        <li><Icon name="message" /> Direct line to your supervisor</li>
                    </ul>
                </div>
            </section>
        </div>
    );
};
