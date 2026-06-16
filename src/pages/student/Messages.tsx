import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import firebase from 'firebase/compat/app';
import './Messages.css';

interface Message {
    id: string;
    sender: string;
    senderName: string;
    recipient: string;
    text: string;
    timestamp?: any;
}

export const StudentMessages: React.FC = () => {
    const [msgText, setMsgText] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const chatStreamRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                // Listen to incoming messages (private direct or broadcast to ALL)
                const unsubIncoming = db.collection('siwes_messages')
                    .where('recipient', 'in', [user.email, 'ALL'])
                    .onSnapshot(snapIncoming => {
                        
                        // Listen to outgoing messages sent by this student
                        db.collection('siwes_messages')
                            .where('sender', '==', user.email)
                            .get()
                            .then(snapOutgoing => {
                                const msgMap = new Map<string, Message>();

                                // Add incoming
                                snapIncoming.forEach(doc => {
                                    const d = doc.data();
                                    msgMap.set(doc.id, {
                                        id: doc.id,
                                        sender: d.sender || '',
                                        senderName: d.senderName || '',
                                        recipient: d.recipient || '',
                                        text: d.text || '',
                                        timestamp: d.timestamp
                                    });
                                });

                                // Add outgoing
                                snapOutgoing.forEach(doc => {
                                    const d = doc.data();
                                    msgMap.set(doc.id, {
                                        id: doc.id,
                                        sender: d.sender || '',
                                        senderName: d.senderName || '',
                                        recipient: d.recipient || '',
                                        text: d.text || '',
                                        timestamp: d.timestamp
                                    });
                                });

                                // Convert map to array and sort by timestamp
                                const sortedList = Array.from(msgMap.values()).sort((a, b) => {
                                    const timeA = a.timestamp?.toDate()?.getTime() || 0;
                                    const timeB = b.timestamp?.toDate()?.getTime() || 0;
                                    return timeA - timeB;
                                });

                                setMessages(sortedList);
                            });
                    });

                return () => {
                    unsubIncoming();
                };
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Auto scroll chat
    useEffect(() => {
        if (chatStreamRef.current) {
            chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        const user = auth.currentUser;
        if (!user || !msgText.trim()) return;

        try {
            await db.collection('siwes_messages').add({
                sender: user.email,
                senderName: user.displayName || "Student",
                recipient: "SUPERVISOR",
                text: msgText.trim(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            setMsgText('');
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

                        if (msg.sender === auth.currentUser?.email) {
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
                                    marginLeft: msg.sender === auth.currentUser?.email ? 'auto' : undefined 
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
