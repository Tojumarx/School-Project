import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../supabaseClient';
import './Broadcast.css';

interface Message {
    id: string;
    sender: string;
    senderName: string;
    recipient: string;
    text: string;
    created_at?: string;
}

interface StudentCache {
    fullName: string;
    email: string;
}

export const SupervisorBroadcast: React.FC = () => {
    const [incomingMsgs, setIncomingMsgs] = useState<Message[]>([]);
    const [studentsCache, setStudentsCache] = useState<StudentCache[]>([]);
    
    // Dispatch states
    const [scope, setScope] = useState<'ALL' | 'DIRECT'>('ALL');
    const [targetEmail, setTargetEmail] = useState<string>('');
    const [msgBody, setMsgBody] = useState<string>('');
    const [dispatching, setDispatching] = useState<boolean>(false);
    
    // Autocomplete UI
    const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);
    const [autocompleteMatches, setAutocompleteMatches] = useState<StudentCache[]>([]);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchStudentsAndMessages();

        // Close autocomplete when clicking outside
        const handleOutsideClick = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowAutocomplete(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);

        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    const fetchStudentsAndMessages = async () => {
        try {
            // Fetch students list
            const studentsRes = await fetch(`${BACKEND_URL}/api/students`);
            const students = await studentsRes.json();
            setStudentsCache(students.map((s: any) => ({
                fullName: s.full_name || s.email,
                email: s.email
            })));

            // Fetch messages
            const msgRes = await fetch(`${BACKEND_URL}/api/messages`);
            const allMsgs = await msgRes.json();
            const incoming = allMsgs
                .filter((m: any) => m.receiver_email === 'SUPERVISOR')
                .map((m: any) => ({
                    id: m.id,
                    sender: m.sender_email || '',
                    senderName: m.sender_name || m.sender_email || '',
                    recipient: m.receiver_email || '',
                    text: m.content || '',
                    created_at: m.created_at
                }));
            setIncomingMsgs(incoming);
        } catch (err) {
            console.error("Failed to load broadcast data: ", err);
        }
    };

    const handleAutocompleteChange = (val: string) => {
        setTargetEmail(val);
        const term = val.toLowerCase().trim();
        if (!term) {
            setAutocompleteMatches([]);
            setShowAutocomplete(false);
            return;
        }

        const matches = studentsCache.filter(s => 
            s.fullName.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term)
        );

        setAutocompleteMatches(matches);
        setShowAutocomplete(matches.length > 0);
    };

    const handleSelectStudent = (email: string) => {
        setTargetEmail(email);
        setShowAutocomplete(false);
    };

    const handleReplyShortcut = (email: string) => {
        setScope('DIRECT');
        setTargetEmail(email);
        setShowAutocomplete(false);
        const textarea = document.getElementById('msgBodyTextarea');
        if (textarea) {
            textarea.focus();
        }
    };

    const handleDispatch = async () => {
        if (!msgBody.trim()) return;
        if (scope === 'DIRECT' && !targetEmail.trim()) {
            alert("Please specify a target student email.");
            return;
        }

        setDispatching(true);
        try {
            await fetch(`${BACKEND_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_email: 'SUPERVISOR',
                    receiver_email: scope === 'ALL' ? 'ALL' : targetEmail.trim(),
                    content: msgBody.trim()
                })
            });

            alert("Message deployed successfully!");
            setMsgBody('');
            setTargetEmail('');
            fetchStudentsAndMessages();
        } catch (err: any) {
            alert("Dispatch error: " + err.message);
        } finally {
            setDispatching(false);
        }
    };

    return (
        <div className="animated-fade-in" style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            
            {/* Left box: Incoming student inquiries */}
            <div className="card" style={{ flex: 1.2, minWidth: '320px' }}>
                <h3 className="card-title">📥 Incoming Inquiries</h3>
                <div className="chat-container" id="studentMailStream" style={{ height: '400px' }}>
                    {incomingMsgs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '10px' }}>
                            No student inquiries received.
                        </p>
                    ) : (
                        incomingMsgs.map(m => (
                            <div 
                                key={m.id} 
                                className="message-bubble msg-student-sent" 
                                style={{ width: '100%', animation: 'scaleUp 0.3s ease', marginBottom: '16px' }}
                            >
                                <b>From: {m.senderName}</b> (<small style={{ color: '#64748b' }}>{m.sender}</small>)
                                <p style={{ margin: '8px 0', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: '#334155', wordBreak: 'break-word' }}>
                                    {m.text}
                                </p>
                                <button 
                                    onClick={() => handleReplyShortcut(m.sender)} 
                                    className="btn btn-primary" 
                                    style={{ padding: '4px 12px', fontSize: '11px', width: 'auto', borderRadius: '4px' }}
                                >
                                    Reply
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right box: Send message Form */}
            <div className="card" style={{ flex: 1, minWidth: '300px' }}>
                <h3 className="card-title">📤 Send a Message</h3>
                <div className="form-group">
                    <label>Audience Target</label>
                    <select 
                        value={scope} 
                        onChange={(e) => {
                            setScope(e.target.value as 'ALL' | 'DIRECT');
                            setShowAutocomplete(false);
                        }}
                    >
                        <option value="ALL">📢 General Broadcast Notification (All Students)</option>
                        <option value="DIRECT">🔒 Private Direct Note (Single Student)</option>
                    </select>
                </div>
                
                {scope === 'DIRECT' && (
                    <div className="form-group" style={{ position: 'relative' }} ref={autocompleteRef}>
                        <label>Target Student Name or Email</label>
                        <div className="autocomplete-container">
                            <input 
                                type="text" 
                                value={targetEmail} 
                                onChange={(e) => handleAutocompleteChange(e.target.value)} 
                                autoComplete="off" 
                                placeholder="Type student name or email..." 
                            />
                            {showAutocomplete && (
                                <div className="autocomplete-dropdown" style={{ display: 'block' }}>
                                    {autocompleteMatches.map((s, index) => (
                                        <div 
                                            key={`match-${index}`} 
                                            className="autocomplete-item"
                                            onClick={() => handleSelectStudent(s.email)}
                                        >
                                            <b>👤 {s.fullName}</b>
                                            <br />
                                            <small style={{ color: '#64748b' }}>{s.email}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label>Message Content</label>
                    <textarea 
                        id="msgBodyTextarea"
                        value={msgBody} 
                        onChange={(e) => setMsgBody(e.target.value)} 
                        rows={4} 
                        placeholder="Write announcements, log update notices, or specific feedback here..."
                    ></textarea>
                </div>
                
                <button 
                    onClick={handleDispatch} 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    disabled={dispatching}
                >
                    {dispatching ? 'Deploying Message...' : 'Deploy Message'}
                </button>
            </div>

        </div>
    );
};
