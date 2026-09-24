import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './Settings.css';

export const StudentSettings: React.FC = () => {
    const [fullName, setFullName] = useState<string>('');
    const [gender, setGender] = useState<string>('Male');
    const [dob, setDob] = useState<string>('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const metadata = session.user.user_metadata || {};
                setFullName(metadata.full_name || session.user.email?.split('@')[0] || '');
                setGender(metadata.gender || 'Male');
                setDob(metadata.dob || '');
                setAvatarUrl(metadata.avatar_url || '');
            }
        });
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName.trim(),
                    gender: gender,
                    dob: dob,
                    avatar_url: avatarUrl.trim()
                }
            });

            if (error) throw error;
            alert("Profile records updated!");
        } catch (err: any) {
            alert("Error updating profile: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card animated-fade-in">
            <h2 className="card-title">⚙️ Update Your SIWES Profile</h2>
            <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                    <label>Full Name</label>
                    <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        required 
                        placeholder="Enter full name" 
                    />
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                        <label>Gender</label>
                        <select 
                            value={gender} 
                            onChange={(e) => setGender(e.target.value)}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                        <label>Date of Birth</label>
                        <input 
                            type="date" 
                            value={dob} 
                            onChange={(e) => setDob(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Profile Picture URL Link</label>
                    <input 
                        type="text" 
                        value={avatarUrl} 
                        onChange={(e) => setAvatarUrl(e.target.value)} 
                        placeholder="Paste image hosted url link if available" 
                    />
                </div>
                <button 
                    type="submit" 
                    className="btn btn-accent" 
                    style={{ width: 'auto' }}
                    disabled={saving}
                >
                    {saving ? 'Saving Profile Changes...' : 'Save Profile Changes'}
                </button>
            </form>
        </div>
    );
};
