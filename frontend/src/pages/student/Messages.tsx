import React, { useState, useEffect, useRef } from 'react';
import { supabase, BACKEND_URL } from '../../supabaseClient';
import './Messages.css';

interface Message {
    id: string;
    sender: string;
    senderName: string;
    recipient: string;
    text: string;
    created_at?: string;
}

export const StudentMessages: React.FC = () => {
    const [msgText, setMsgText] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const chatStreamRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) {
                const email = session.user.email;
                setCurrentUserEmail(email);
                fetchMessages();
            }
        });
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/messages`);
            const data = await res.json();
            const list = data.map((m: any) => ({
                id: m.id,
                sender: m.sender_email || '',
                senderName: m.sender_name || '',
                recipient: m.receiver_email || 'ALL',
                text: m.content || '',
                created_at: m.created_at
            }));
            setMessages(list);
        } catch (err) {
            console.error("Failed to load messages: ", err);
        }
    };

    // Auto scroll chat
    useEffect(() => {
        if (chatStreamRef.current) {
            chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!currentUserEmail || !msgText.trim()) return;

        try {
            await fetch(`${BACKEND_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_email: currentUserEmail,
                    receiver_email: 'SUPERVISOR',
                    content: msgText.trim()
                })
            });
            setMsgText('');
            fetchMessages();
        } catch (err: any) {
            alert("Failed to send: " + err.message);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div className="card animated-fade-in">
            <h2 className="card-title">💬 Chat with Supervisor</h2>
            <div className="chat-container" id="chatStream" ref={chatStreamRef}>
                {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '4px' }}>No messages in thread.</p>
                ) : (
                    messages.map(msg => {
                        let cls = '';
                        let lbl = '';

                        if (msg.sender === currentUserEmail) {
                            cls = 'msg-student-sent';
                            lbl = '📤 Sent';
                        } else if (msg.recipient === 'ALL') {
                            cls = 'msg-general';
                            lbl = '📢 Broadcast Notice';
                        } else {
                            cls = 'msg-private';
                            lbl = '🔒 Private Message';
                        }

                        return (
                            <div 
                                key={msg.id} 
                                className={`message-bubble ${cls}`} 
                                style={{ 
                                    animation: 'scaleUp 0.25s ease',
                                    marginLeft: msg.sender === currentUserEmail ? 'auto' : undefined 
                                }}
                            >
                                <small style={{ display: 'block', fontWeight: 700, color: 'var(--primary-slate)', marginBottom: '4px' }}>
                                    {lbl}
                                </small>
                                <p style={{ wordBreak: 'break-word' }}>{msg.text}</p>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                    type="text" 
                    value={msgText} 
                    onChange={(e) => setMsgText(e.target.value)} 
                    onKeyDown={handleKeyPress}
                    placeholder="Type your reply here..." 
                />
                <button 
                    onClick={handleSendMessage} 
                    className="btn btn-primary" 
                    style={{ width: 'auto', padding: '0 24px' }}
                >
                    Send
                </button>
            </div>
        </div>
    );
};
