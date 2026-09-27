import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import coverImg from '../assets/login_cover.png';
import './Login.css';

interface Supervisor {
    id: string | number;
    full_name?: string;
    name?: string;
    email: string;
    department?: string;
    institution?: string;
}

export const Login: React.FC = () => {
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'student' | 'supervisor'>('student');

    // Student fields
    const [studentId, setStudentId] = useState('');
    const [course, setCourse] = useState('');
    const [level, setLevel] = useState('400');
    const [department, setDepartment] = useState('');
    const [institution, setInstitution] = useState('');
    const [gender, setGender] = useState('Male');

    // Supervisor Search / Selection
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

    // Supervisor fields
    const [title, setTitle] = useState('Dr.');
    const [officeLoc, setOfficeLoc] = useState('');

    // Fetch initial list of supervisors for student select dropdown
    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
                const res = await fetch(`${backendUrl}/api/supervisors`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setSupervisors(data);
                        return;
                    }
                }
            } catch (err) {
                console.warn('Backend supervisor fetch error, using fallback');
            }
            // Default fallback supervisors
            setSupervisors([
                { id: '1', full_name: 'Dr. O. A. Bode', email: 'bode@fupre.edu.ng', department: 'Computer Science', institution: 'FUPRE' },
                { id: '2', full_name: 'Prof. E. K. Akpata', email: 'akpata@fupre.edu.ng', department: 'Electrical Eng', institution: 'FUPRE' },
                { id: '3', full_name: 'Dr. Mrs. N. Nwosu', email: 'nwosu@fupre.edu.ng', department: 'Computer Science', institution: 'FUPRE' },
            ]);
        };
        fetchSupervisors();
    }, []);

    // 1. LOGIN HANDLER
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // First authenticate with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) throw new Error(`Auth Failed: ${error.message}`);

            const userRole = data.user?.user_metadata?.role || (email.includes('supervisor') ? 'supervisor' : 'student');

            // Sync user profile to PostgreSQL DB via backend API
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const syncRes = await fetch(`${backendUrl}/api/auth/sync-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.user.email,
                    full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                    role: userRole,
                    ...data.user.user_metadata,
                }),
            });

            if (!syncRes.ok) {
                const errJson = await syncRes.json().catch(() => ({}));
                throw new Error(`Database Error: ${errJson.message || 'Failed to sync user record with database.'}`);
            }

            const syncedUser = await syncRes.json();

            // Store active session user info
            localStorage.setItem('user_role', syncedUser.role || userRole);
            localStorage.setItem('user_email', data.user.email || '');
            localStorage.setItem('user_name', syncedUser.full_name || '');

            if ((syncedUser.role || userRole) === 'supervisor') {
                navigate('/supervisor/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err: any) {
            alert("Login failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 2. UNIFIED SINGLE-FORM SIGNUP HANDLER
    const handleSingleFormSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !fullName) {
            alert('Please fill out all required fields');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                email: email.trim(),
                password: password,
                full_name: fullName.trim(),
                role: role,
                ...(role === 'student' ? {
                    student_id: studentId.trim(),
                    course: course.trim(),
                    level,
                    department: department.trim(),
                    institution: institution.trim(),
                    gender,
                    supervisor_email: selectedSupervisor?.email || '',
                    supervisor_name: selectedSupervisor?.full_name || selectedSupervisor?.name || '',
                    supervisor_id: selectedSupervisor?.id ? Number(selectedSupervisor.id) : null,
                } : {
                    title,
                    department: department.trim(),
                    office_loc: officeLoc.trim(),
                    institution: institution.trim(),
                })
            };

            // Single registration request to NestJS Backend (which registers in DB & Supabase Auth)
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const registerRes = await fetch(`${backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!registerRes.ok) {
                const errData = await registerRes.json().catch(() => ({}));
                throw new Error(errData.message || 'Could not save profile to database.');
            }

            const resData = await registerRes.json();
            const dbUser = resData.user || resData;

            if (!dbUser || !dbUser.id) {
                throw new Error('Database Error: User record was not persisted.');
            }

            // Store local user session info
            localStorage.setItem('user_role', dbUser.role || role);
            localStorage.setItem('user_email', email.trim());
            localStorage.setItem('user_name', fullName.trim());

            alert("Account created successfully and saved to Database!");
            if ((dbUser.role || role) === 'supervisor') {
                navigate('/supervisor/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err: any) {
            alert("Signup failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left side - Dynamic Auth Form Container */}
            <div className="login-left-side">
                <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto' }}>
                    <h2 style={{ color: 'var(--primary-slate)', fontWeight: 800, marginBottom: '5px', fontSize: '2rem', letterSpacing: '-0.03em' }}>
                        SIWES Portal
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '20px', fontWeight: 500 }}>
                        {mode === 'LOGIN' ? 'Sign in to manage your logbook records' : 'Create your account on the SIWES portal'}
                    </p>

                    {/* Navigation Tabs between Login and Signup */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                        <button 
                            onClick={() => setMode('LOGIN')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                borderRadius: '6px',
                                background: mode === 'LOGIN' ? '#ffffff' : 'transparent',
                                fontWeight: 700,
                                color: mode === 'LOGIN' ? '#0f172a' : '#64748b',
                                boxShadow: mode === 'LOGIN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={() => setMode('SIGNUP')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                borderRadius: '6px',
                                background: mode === 'SIGNUP' ? '#ffffff' : 'transparent',
                                fontWeight: 700,
                                color: mode === 'SIGNUP' ? '#0f172a' : '#64748b',
                                boxShadow: mode === 'SIGNUP' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* MODE 1: LOGIN FORM */}
                    {mode === 'LOGIN' && (
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                    placeholder="example@fupre.edu.ng"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Password</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                disabled={loading}
                                style={{ width: '100%', marginTop: '15px', padding: '14px' }}
                            >
                                {loading ? 'Signing In & Verifying DB...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* MODE 2: SINGLE UNIFIED SIGNUP FORM (Rendered inside left side split view) */}
                    {mode === 'SIGNUP' && (
                        <form onSubmit={handleSingleFormSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* ROLE TOGGLE */}
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    I am registering as:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div 
                                        onClick={() => setRole('student')}
                                        className={`role-card ${role === 'student' ? 'selected' : ''}`}
                                        style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}
                                    >
                                        <span style={{ fontSize: '1.4rem' }}>🎓</span>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Student</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Daily work logs</div>
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => setRole('supervisor')}
                                        className={`role-card ${role === 'supervisor' ? 'selected' : ''}`}
                                        style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}
                                    >
                                        <span style={{ fontSize: '1.4rem' }}>👨‍🏫</span>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Supervisor</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Oversee logbooks</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CREDENTIALS */}
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Full Name</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    required 
                                    placeholder="e.g. Richmond Alex"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                    placeholder="example@fupre.edu.ng"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Password</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••"
                                />
                            </div>

                            {/* ROLE SPECIFIC FIELDS */}
                            {role === 'student' ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Matric / Student ID</label>
                                            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="CPN/2020/1042" required />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Course of Study</label>
                                            <input type="text" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Computer Science" required />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Level</label>
                                            <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="300">300 Level</option>
                                                <option value="400">400 Level</option>
                                                <option value="500">500 Level</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Gender</label>
                                            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Department</label>
                                            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" required />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Institution</label>
                                            <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="FUPRE" required />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Assigned Academic Supervisor</label>
                                        <select 
                                            onChange={(e) => {
                                                const selected = supervisors.find(s => String(s.id) === e.target.value || s.email === e.target.value);
                                                setSelectedSupervisor(selected || null);
                                            }}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                        >
                                            <option value="">Select a Supervisor...</option>
                                            {supervisors.map(sup => (
                                                <option key={sup.id} value={sup.email}>
                                                    {sup.full_name || sup.name || sup.email} ({sup.department || 'Staff'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Title</label>
                                            <select value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="Dr.">Dr.</option>
                                                <option value="Prof.">Prof.</option>
                                                <option value="Mr.">Mr.</option>
                                                <option value="Mrs.">Mrs.</option>
                                                <option value="Engr.">Engr.</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Department</label>
                                            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" required />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Office Location</label>
                                            <input type="text" value={officeLoc} onChange={(e) => setOfficeLoc(e.target.value)} placeholder="Block B, Room 204" required />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Institution</label>
                                            <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="FUPRE" required />
                                        </div>
                                    </div>
                                </>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '10px', padding: '14px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 800 }}
                            >
                                {loading ? 'Creating Account & Registering...' : 'Create Account & Sign In'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Right side - Cover Image */}
            <div className="login-right-side" style={{ backgroundImage: `url(${coverImg})` }}>
                <div className="login-cover-content">
                    <h2>SIWES Logbook Portal</h2>
                    <p>
                        A digital environment to document your daily work log entries, verify GPS coordinates, upload proof of work done, and maintain interactive contact with your supervisor.
                    </p>
                </div>
            </div>
        </div>
    );
};
