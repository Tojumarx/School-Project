import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import coverImg from '../assets/login_cover.png';
import './Login.css';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check current Supabase auth session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const userEmail = session.user.email ? session.user.email.toLowerCase() : '';
                if (userEmail.includes('admin') || userEmail.includes('supervisor')) {
                    navigate('/supervisor/dashboard');
                } else {
                    navigate('/student/dashboard');
                }
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const userEmail = session.user.email ? session.user.email.toLowerCase() : '';
                if (userEmail.includes('admin') || userEmail.includes('supervisor')) {
                    navigate('/supervisor/dashboard');
                } else {
                    navigate('/student/dashboard');
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) throw error;

            const userEmail = data.user?.email?.toLowerCase() || '';
            if (userEmail.includes('admin') || userEmail.includes('supervisor')) {
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

    return (
        <div className="login-container">
            {/* Left side - Login Form */}
            <div className="login-left-side">
                <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                    <h2 style={{ color: 'var(--primary-slate)', fontWeight: 800, marginBottom: '5px', fontSize: '2rem', letterSpacing: '-0.03em' }}>
                        SIWES Portal
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '35px', fontWeight: 500 }}>
                        Sign in to manage your logbook records
                    </p>
                    
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
