import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import coverImg from '../assets/login_cover.png';
import institutionList from '../data/institutions.json';
import './Login.css';

interface Supervisor {
    id: string | number;
    full_name?: string;
    name?: string;
    email: string;
    department?: string;
    institution?: string;
}

const POPULAR_DEPARTMENTS = [
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
    'Other (Specify Custom Department)',
];

export const Login: React.FC = () => {
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Account Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    
    // Default Role is 'student' as requested
    const [role, setRole] = useState<'student' | 'supervisor'>('student');

    // Student specific fields
    const [studentId, setStudentId] = useState('');
    const [course, setCourse] = useState('');
    const [level, setLevel] = useState('400');
    const [gender, setGender] = useState('Male');

    // Department selection state (with custom fallback)
    const [selectedDept, setSelectedDept] = useState('Computer Science');
    const [customDept, setCustomDept] = useState('');

    // Institution selection state (Searchable from Excel list + custom option)
    const [institutionSearch, setInstitutionSearch] = useState('Federal University of Petroleum Resources Effurun');
    const [customInst, setCustomInst] = useState('');
    const [showInstDropdown, setShowInstDropdown] = useState(false);

    // Supervisor Search & Selection
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

    // Supervisor specific fields
    const [title, setTitle] = useState('Dr.');
    const [officeLoc, setOfficeLoc] = useState('');

    // Filter institutions from Excel data based on search input
    const filteredInstitutions = useMemo(() => {
        if (!institutionSearch.trim()) return institutionList.slice(0, 30);
        const query = institutionSearch.toLowerCase();
        const matches = institutionList.filter((inst: string) => inst.toLowerCase().includes(query));
        return matches.length > 0 ? matches.slice(0, 30) : [];
    }, [institutionSearch]);

    // Fetch supervisors from backend API
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
                console.warn('Backend supervisor fetch error, using fallbacks');
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

    // Get final department string
    const getFinalDepartment = () => {
        if (selectedDept === 'Other (Specify Custom Department)') {
            return customDept.trim() || 'General';
        }
        return selectedDept;
    };

    // Get final institution string
    const getFinalInstitution = () => {
        if (institutionSearch === 'Other (Specify Custom Institution)') {
            return customInst.trim() || 'FUPRE';
        }
        return institutionSearch.trim() || 'Federal University of Petroleum Resources Effurun';
    };

    // 1. LOGIN HANDLER
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) throw new Error(`Auth Failed: ${error.message}`);

            const userRole = data.user?.user_metadata?.role || (email.includes('supervisor') ? 'supervisor' : 'student');

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

    // 2. UNIFIED REAL-TIME SIGNUP HANDLER
    const handleSingleFormSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !fullName) {
            alert('Please fill out all required credentials (name, email, password)');
            return;
        }

        setLoading(true);
        try {
            const finalDept = getFinalDepartment();
            const finalInst = getFinalInstitution();

            const payload = {
                email: email.trim(),
                password: password,
                full_name: fullName.trim(),
                role: role,
                department: finalDept,
                institution: finalInst,
                ...(role === 'student' ? {
                    student_id: studentId.trim(),
                    course: course.trim() || finalDept,
                    level,
                    gender,
                    supervisor_email: selectedSupervisor?.email || '',
                    supervisor_name: selectedSupervisor?.full_name || selectedSupervisor?.name || '',
                    supervisor_id: selectedSupervisor?.id ? Number(selectedSupervisor.id) : null,
                } : {
                    title,
                    office_loc: officeLoc.trim(),
                })
            };

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
                            type="button"
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
                            type="button"
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
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        placeholder="••••••••"
                                        style={{ paddingRight: '40px', width: '100%' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            /* Eye Slash Icon (Hide) */
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            /* Eye Open Icon (Show) */
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                </div>
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

                    {/* MODE 2: REAL-TIME SINGLE SIGNUP FORM */}
                    {mode === 'SIGNUP' && (
                        <form onSubmit={handleSingleFormSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* REAL-TIME ROLE TOGGLE (Default is Student) */}
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
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: role === 'student' ? '#2563eb' : '#64748b' }}>
                                            {/* Academic / Student Cap Icon */}
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                                                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                                            </svg>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Student</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Log daily entries</div>
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => setRole('supervisor')}
                                        className={`role-card ${role === 'supervisor' ? 'selected' : ''}`}
                                        style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: role === 'supervisor' ? '#2563eb' : '#64748b' }}>
                                            {/* User / Teacher Badge Icon */}
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                        </div>
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
                                    placeholder="John Doe"
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
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        placeholder="••••••••"
                                        style={{ paddingRight: '40px', width: '100%' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            /* Eye Slash Icon (Hide) */
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            /* Eye Open Icon (Show) */
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* SEARCHABLE / DROPDOWN DEPARTMENT */}
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Department</label>
                                <select 
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                >
                                    {POPULAR_DEPARTMENTS.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>

                                {/* Custom department text field if "Other" is selected */}
                                {selectedDept === 'Other (Specify Custom Department)' && (
                                    <input 
                                        type="text"
                                        value={customDept}
                                        onChange={(e) => setCustomDept(e.target.value)}
                                        placeholder="Type custom department name..."
                                        style={{ marginTop: '8px' }}
                                        required
                                    />
                                )}
                            </div>

                            {/* SEARCHABLE INSTITUTION DROPDOWN (Loaded from Nigerian Universities & Polytechnics Excel file) */}
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Institution / University / Polytechnic</label>
                                <input 
                                    type="text" 
                                    value={institutionSearch}
                                    onChange={(e) => {
                                        setInstitutionSearch(e.target.value);
                                        setShowInstDropdown(true);
                                    }}
                                    onFocus={() => setShowInstDropdown(true)}
                                    placeholder="Type or search university/polytechnic..."
                                    required
                                />

                                {/* Search dropdown list from Excel */}
                                {showInstDropdown && (
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            maxHeight: '180px',
                                            overflowY: 'auto',
                                            background: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            zIndex: 10,
                                            marginTop: '4px'
                                        }}
                                    >
                                        {filteredInstitutions.length > 0 ? (
                                            filteredInstitutions.map((inst: string, idx: number) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => {
                                                        setInstitutionSearch(inst);
                                                        setShowInstDropdown(false);
                                                    }}
                                                    style={{
                                                        padding: '10px 12px',
                                                        fontSize: '0.825rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        color: '#1e293b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                    className="institution-item"
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                                                        <path d="M3 21h18M3 7l9-4 9 4M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8"></path>
                                                    </svg>
                                                    {inst}
                                                </div>
                                            ))
                                        ) : (
                                            <div 
                                                onClick={() => {
                                                    setInstitutionSearch('Other (Specify Custom Institution)');
                                                    setShowInstDropdown(false);
                                                }}
                                                style={{ padding: '10px 12px', fontSize: '0.825rem', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                + Other (Specify custom institution)
                                            </div>
                                        )}
                                        <div 
                                            onClick={() => {
                                                setInstitutionSearch('Other (Specify Custom Institution)');
                                                setShowInstDropdown(false);
                                            }}
                                            style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#2563eb', background: '#eff6ff', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}
                                        >
                                            Can't find yours? Click here to type custom institution
                                        </div>
                                    </div>
                                )}

                                {/* Custom institution text field if "Other" is selected */}
                                {institutionSearch === 'Other (Specify Custom Institution)' && (
                                    <input 
                                        type="text"
                                        value={customInst}
                                        onChange={(e) => setCustomInst(e.target.value)}
                                        placeholder="Type custom institution name..."
                                        style={{ marginTop: '8px' }}
                                        required
                                    />
                                )}
                            </div>

                            {/* REAL-TIME ROLE-SPECIFIC FIELDS */}
                            {role === 'student' ? (
                                /* STUDENT REAL-TIME FIELDS */
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Matric / Student ID</label>
                                            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="CPN/2020/1042" required />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Course of Study</label>
                                            <input type="text" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. Software Engineering" required />
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
                                /* SUPERVISOR REAL-TIME FIELDS */
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
                                            <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Office / Building Location</label>
                                            <input type="text" value={officeLoc} onChange={(e) => setOfficeLoc(e.target.value)} placeholder="Block B, Room 204" required />
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
