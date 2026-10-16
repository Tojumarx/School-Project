import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatTime } from '../../lib/dates';
import type { Message } from '../../lib/types';
import { Alert, Avatar, Empty, Icon, PageHeader } from '../../components/ui';

const POLL_MS = 5000;

export const StudentMessages: React.FC = () => {
    const { profile } = useAuth();
    const supervisor = profile?.supervisor;

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const streamRef = useRef<HTMLDivElement>(null);
    const lastCount = useRef(0);

    const load = useCallback(async () => {
        try {
            setMessages(await api<Message[]>('/messages/thread'));
        } catch (err) {
            setError(errorMessage(err));
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [load]);

    // Only jump to the newest message when one arrives
    useEffect(() => {
        if (messages.length !== lastCount.current && streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
        }
        lastCount.current = messages.length;
    }, [messages]);

    const send = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const content = text.trim();
        if (!content || sending) return;
        setSending(true);
        setError('');
        try {
            await api('/messages', { method: 'POST', body: { content } });
            setText('');
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSending(false);
        }
    };

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    if (!supervisor) {
        return (
            <>
                <PageHeader title="Supervisor chat" />
                <section className="card">
                    <Empty icon="message" title="No supervisor assigned yet">
                        Choose your supervisor in <Link to="/student/settings">My Profile</Link> to start chatting.
                    </Empty>
                </section>
            </>
        );
    }

    return (
        <>
            <PageHeader title="Supervisor chat" subtitle="Ask questions and get notices from your supervisor." />
            <section className="card chat-card">
                <div className="chat-head">
                    <Avatar name={supervisor.full_name} size={42} />
                    <div>
                        <strong>{[supervisor.title, supervisor.full_name].filter(Boolean).join(' ')}</strong>
                        <small>{supervisor.department || supervisor.email}</small>
                    </div>
                </div>

                <div className="chat-stream" ref={streamRef}>
                    {messages.length === 0 ? (
                        <Empty icon="message" title="No messages yet">
                            Say hello — your supervisor will see it right away.
                        </Empty>
                    ) : (
                        messages.map((m) => {
                            const mine = m.sender_id === profile?.id;
                            return (
                                <div key={m.id} className={`bubble ${mine ? 'mine' : 'theirs'} ${m.is_broadcast ? 'broadcast' : ''}`}>
                                    {m.is_broadcast && (
                                        <span className="bubble-tag">
                                            <Icon name="megaphone" size={12} /> Notice to all students
                                        </span>
                                    )}
                                    <p>{m.content}</p>
                                    <time>{formatTime(m.created_at)}</time>
                                </div>
                            );
                        })
                    )}
                </div>

                {error && <Alert kind="error">{error}</Alert>}

                <form className="composer" onSubmit={send}>
                    <textarea
                        rows={1}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                        maxLength={2000}
                    />
                    <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
                        <Icon name="send" size={16} /> Send
                    </button>
                </form>
            </section>
        </>
    );
};
