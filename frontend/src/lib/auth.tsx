/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { api } from './api';
import type { Profile, Role } from './types';

interface AuthState {
    profile: Profile | null;
    loading: boolean;
    /** Re-fetches the profile from the database. Returns null when signed out. */
    refresh: () => Promise<Profile | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const portalFor = (role: Role) => (role === 'supervisor' ? '/supervisor/dashboard' : '/student/dashboard');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
            setProfile(null);
            return null;
        }
        try {
            const me = await api<Profile>('/auth/me');
            setProfile(me);
            return me;
        } catch {
            // Token rejected or backend unreachable: treat as signed out
            setProfile(null);
            return null;
        }
    }, []);

    useEffect(() => {
        refresh().finally(() => setLoading(false));

        const { data } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') setProfile(null);
        });
        return () => data.subscription.unsubscribe();
    }, [refresh]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setProfile(null);
    }, []);

    return <AuthContext.Provider value={{ profile, loading, refresh, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};

/** Gate for a portal: signed-out users go to login, wrong-role users go to their own portal. */
export const RequireRole: React.FC<{ role: Role; children: React.ReactNode }> = ({ role, children }) => {
    const { profile, loading } = useAuth();
    if (loading) return <div className="boot">Loading…</div>;
    if (!profile) return <Navigate to="/" replace />;
    if (profile.role !== role) return <Navigate to={portalFor(profile.role)} replace />;
    return <>{children}</>;
};
