import React, { useState, useEffect } from 'react';
import { db, auth, firebaseConfig } from '../../firebase';
import firebase from 'firebase/compat/app';
import './Students.css';

interface StudentProfile {
    id: string;
    fullName: string;
    gender: string;
    email: string;
}

export const SupervisorStudents: React.FC = () => {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [searchVal, setSearchVal] = useState<string>('');
    const [newEmail, setNewEmail] = useState<string>('');
    const [newPass, setNewPass] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                fetchSupervisedStudents();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const fetchSupervisedStudents = () => {
        db.collection('student_profiles').onSnapshot(snap => {
            const list: StudentProfile[] = [];
            snap.forEach(doc => {
                const d = doc.data();
                list.push({
                    id: doc.id,
                    fullName: d.fullName || 'Anonymous',
                    gender: d.gender || 'Not specified',
                    email: d.email || ''
                });
            });
            setStudents(list);
        });
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim() || newPass.length < 6) {
            alert("Please provide a valid email and a password of at least 6 characters.");
            return;
        }

        setSubmitting(true);
        try {
            // Provision secondary instance to prevent supervisor logout
            let secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryInstance");
            const res = await secondaryApp.auth().createUserWithEmailAndPassword(newEmail.trim(), newPass);
            
            if (res.user) {
                await db.collection('student_profiles').doc(newEmail.trim()).set({
                    email: newEmail.trim(),
                    fullName: newEmail.split('@')[0].toUpperCase(),
                    gender: "Not specified",
                    dob: "",
                    avatar: "",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            alert(`Account successfully created for ${newEmail.trim()}!`);
            setNewEmail('');
            setNewPass('');
            await firebase.app("SecondaryInstance").delete();
        } catch (err: any) {
            alert("Error provisioning profile: " + err.message);
            // Attempt secondary cleanup if initialized
            try {
                await firebase.app("SecondaryInstance").delete();
            } catch (e) {}
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(student => 
        student.fullName.toLowerCase().includes(searchVal.toLowerCase()) ||
        student.email.toLowerCase().includes(searchVal.toLowerCase())
    );

    return (
        <div className="animated-fade-in">
            {/* Metric */}
            <div className="metrics-grid">
                <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-blue)', width: '100%' }}>
                    <div className="metric-data">
                        <h4>Students Under Supervision</h4>
                        <p>{students.length}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-blue)' }}>👥</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
                
                {/* Students list */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <h3 className="card-title">👥 Registered Students</h3>
                    
                    <div className="filter-row" style={{ padding: '12px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ width: '100%', marginBottom: 0 }}>
                            <input 
                                type="text" 
                                value={searchVal} 
                                onChange={(e) => setSearchVal(e.target.value)} 
                                placeholder="Quick search by student name or email..." 
                            />
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Gender</th>
                                    <th>Email Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                                            No registered students found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(student => (
                                        <tr key={student.id} className="student-row" style={{ animation: 'scaleUp 0.3s ease' }}>
                                            <td data-label="Student">
                                                <b>👤 {student.fullName}</b>
                                            </td>
                                            <td data-label="Gender">
                                                <b>{student.gender}</b>
                                            </td>
                                            <td data-label="Email Address" style={{ fontWeight: 500, color: 'var(--accent-blue)' }}>
                                                {student.email}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Provision Form */}
                <div className="card" style={{ marginBottom: 0 }}>
                    <h3 className="card-title">🆕 Register New Student Account</h3>
                    <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Student Email</label>
                            <input 
                                type="email" 
                                value={newEmail} 
                                onChange={(e) => setNewEmail(e.target.value)} 
                                required 
                                placeholder="name@fupre.edu.ng" 
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Temporary Password</label>
                            <input 
                                type="password" 
                                value={newPass} 
                                onChange={(e) => setNewPass(e.target.value)} 
                                required 
                                placeholder="Min 6 chars" 
                            />
                        </div>
                        <button type="submit" className="btn btn-accent" disabled={submitting}>
                            {submitting ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};
