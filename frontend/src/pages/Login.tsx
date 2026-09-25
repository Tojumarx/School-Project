import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import coverImg from '../assets/login_cover.png';
import './Login.css';

type Step = 'AUTH' | 'ROLE_SELECT' | 'STUDENT_SUPERVISOR_SEARCH' | 'STUDENT_DETAILS' | 'SUPERVISOR_DETAILS';

interface Supervisor {
    id: string;
    full_name?: string;
    name?: string;
    email: string;
    department?: string;
    institution?: string;
}

export const Login: React.FC = () => {
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [step, setStep] = useState<Step>('AUTH');
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

    // Supervisor Search fields
    const [searchQuery, setSearchQuery] = useState('');
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

    // Supervisor fields
    const [title, setTitle] = useState('Dr.');
    const [officeLoc, setOfficeLoc] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // First authenticate with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) throw error;

            const userRole = data.user?.user_metadata?.role || (email.includes('supervisor') ? 'supervisor' : 'student');

            // Sync user profile to PostgreSQL DB via backend API
            await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/auth/sync-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.user.email,
                    full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                    role: userRole,
                    ...data.user.user_metadata,
                }),
            }).catch(console.error);

            if (userRole === 'supervisor') {
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

    const handleInitialSignup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !fullName) {
            alert('Please fill out all required fields');
            return;
        }
        setStep('ROLE_SELECT');
    };

    const handleRoleChoice = (chosenRole: 'student' | 'supervisor') => {
        setRole(chosenRole);
        if (chosenRole === 'student') {
            setStep('STUDENT_SUPERVISOR_SEARCH');
        } else {
            setStep('SUPERVISOR_DETAILS');
        }
    };

    // Flexible Search for Supervisors calling Backend API
    const handleSearchSupervisors = async () => {
        setSearching(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const res = await fetch(`${backendUrl}/api/supervisors?query=${encodeURIComponent(searchQuery.trim())}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setSupervisors(data);
                    return;
                }
            }

            // Fallback search via Supabase if backend returns empty
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'supervisor');

            if (!error && data) {
                const queryClean = searchQuery.trim().toLowerCase();
                const filtered = data.filter((sup: any) => {
                    const sName = (sup.full_name || sup.name || sup.email || '').toLowerCase();
                    if (!queryClean) return true;
                    const tokens = queryClean.split(/\s+/);
                    return tokens.every(token => sName.includes(token));
                });
                setSupervisors(filtered);
            }
        } catch (err: any) {
            console.error('Search error:', err.message);
            setSupervisors([
                { id: '1', full_name: 'Dr. O. A. Bode', email: 'bode@fupre.edu.ng', department: 'Computer Science', institution: 'FUPRE' },
                { id: '2', full_name: 'Prof. E. K. Akpata', email: 'akpata@fupre.edu.ng', department: 'Electrical Eng', institution: 'FUPRE' },
                { id: '3', full_name: 'Dr. Mrs. N. Nwosu', email: 'nwosu@fupre.edu.ng', department: 'Computer Science', institution: 'FUPRE' },
            ].filter(sup => {
                const sName = sup.full_name.toLowerCase();
                const tokens = searchQuery.trim().toLowerCase().split(/\s+/);
                return tokens.every(token => sName.includes(token));
            }));
        } finally {
            setSearching(false);
        }
    };

    const handleFinalSignup = async () => {
        setLoading(true);
        try {
            const metadata = {
                full_name: fullName,
                role: role,
                ...(role === 'student' ? {
                    student_id: studentId,
                    course,
                    level,
                    department,
                    institution,
                    gender,
                    supervisor_email: selectedSupervisor?.email || '',
                    supervisor_name: selectedSupervisor?.full_name || selectedSupervisor?.name || '',
                } : {
                    title,
                    office_loc: officeLoc,
                    department,
                    institution,
                })
            };

            // Sign up on Supabase Auth
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: metadata
                }
            });

            if (error) throw error;

            // Direct sync to Database via NestJS backend (replicating atlas-dev pattern)
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            await fetch(`${backendUrl}/api/auth/sync-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password,
                    ...metadata,
                }),
            });

            alert("Account created successfully! Saved to Database & Auth provider.");
            if (role === 'supervisor') {
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
            {/* Left side - Dynamic Auth Flow */}
            <div className="login-left-side">
                <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
                    <h2 style={{ color: 'var(--primary-slate)', fontWeight: 800, marginBottom: '5px', fontSize: '2rem', letterSpacing: '-0.03em' }}>
                        SIWES Portal
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '25px', fontWeight: 500 }}>
                        {mode === 'LOGIN' ? 'Sign in to manage your logbook records' : 'Create an account to join the portal'}
                    </p>

                    {/* Navigation Tabs between Login and Signup */}
                    {step === 'AUTH' && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
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
                    )}

                    {/* LOGIN FORM */}
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
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* SIGNUP STEP 1: Basic Information */}
                    {mode === 'SIGNUP' && step === 'AUTH' && (
                        <form onSubmit={handleInitialSignup}>
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
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ width: '100%', marginTop: '15px', padding: '14px' }}
                            >
                                Continue &rarr;
                            </button>
                        </form>
                    )}

                    {/* SIGNUP STEP 2: Role Selection */}
                    {mode === 'SIGNUP' && step === 'ROLE_SELECT' && (
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '15px', color: '#1e293b' }}>
                                Are you a Student or a Supervisor?
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div 
                                    onClick={() => handleRoleChoice('student')}
                                    style={{
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '20px 15px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        backgroundColor: '#f8fafc'
                                    }}
                                    className="role-card"
                                >
                                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎓</div>
                                    <h4 style={{ margin: 0, fontWeight: 700 }}>Student</h4>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Document daily SIWES work & link supervisor</p>
                                </div>
                                <div 
                                    onClick={() => handleRoleChoice('supervisor')}
                                    style={{
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '20px 15px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        backgroundColor: '#f8fafc'
                                    }}
                                    className="role-card"
                                >
                                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👨‍🏫</div>
                                    <h4 style={{ margin: 0, fontWeight: 700 }}>Supervisor</h4>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Oversee student logbooks & broadcast updates</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setStep('AUTH')} 
                                className="btn"
                                style={{ width: '100%', background: '#e2e8f0', color: '#334155' }}
                            >
                                &larr; Back
                            </button>
                        </div>
                    )}

                    {/* SIGNUP STEP 3: Student Supervisor Search */}
                    {mode === 'SIGNUP' && step === 'STUDENT_SUPERVISOR_SEARCH' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '5px' }}>
                                Find & Link Your Supervisor
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>
                                Search by your supervisor's name (partial matches supported):
                            </p>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search supervisor name (e.g. Bode, Akpata...)"
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                                <button 
                                    type="button"
                                    onClick={handleSearchSupervisors}
                                    className="btn btn-primary"
                                    style={{ padding: '10px 16px' }}
                                >
                                    {searching ? '...' : 'Search'}
                                </button>
                            </div>

                            {/* Supervisor list */}
                            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {supervisors.length > 0 ? (
                                    supervisors.map(sup => (
                                        <div 
                                            key={sup.id}
                                            onClick={() => setSelectedSupervisor(sup)}
                                            style={{
                                                padding: '10px 12px',
                                                border: selectedSupervisor?.id === sup.id ? '2px solid var(--primary-slate)' : '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                background: selectedSupervisor?.id === sup.id ? '#f1f5f9' : '#ffffff',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{sup.full_name || sup.name || sup.email}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sup.department || 'Academic Staff'} ({sup.email})</div>
                                            </div>
                                            {selectedSupervisor?.id === sup.id && <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Selected</span>}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                        Type a name and click search to view matching supervisors
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setStep('ROLE_SELECT')} 
                                    className="btn"
                                    style={{ flex: 1, background: '#e2e8f0', color: '#334155' }}
                                >
                                    &larr; Back
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setStep('STUDENT_DETAILS')} 
                                    disabled={!selectedSupervisor}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    Next: Academic Info &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SIGNUP STEP 4: Student Academic Details */}
                    {mode === 'SIGNUP' && step === 'STUDENT_DETAILS' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '15px' }}>
                                Complete Student Profile
                            </h3>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Matric / Student ID</label>
                                <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. CPN/2020/1042" required />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Course of Study</label>
                                <input type="text" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Computer Science" required />
                            </div>
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
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Department</label>
                                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Maths & Computer Science" required />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Institution</label>
                                <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="FUPRE" required />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setStep('STUDENT_SUPERVISOR_SEARCH')} 
                                    className="btn"
                                    style={{ flex: 1, background: '#e2e8f0', color: '#334155' }}
                                >
                                    &larr; Back
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleFinalSignup} 
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    {loading ? 'Creating...' : 'Finish & Sign Up'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SIGNUP STEP 5: Supervisor Details */}
                    {mode === 'SIGNUP' && step === 'SUPERVISOR_DETAILS' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '15px' }}>
                                Complete Supervisor Profile
                            </h3>
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
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Office / Building Location</label>
                                <input type="text" value={officeLoc} onChange={(e) => setOfficeLoc(e.target.value)} placeholder="Block B, Room 204" required />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setStep('ROLE_SELECT')} 
                                    className="btn"
                                    style={{ flex: 1, background: '#e2e8f0', color: '#334155' }}
                                >
                                    &larr; Back
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleFinalSignup} 
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    {loading ? 'Creating...' : 'Finish & Sign Up'}
                                </button>
                            </div>
                        </div>
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
