import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatTime } from '../../lib/dates';
import type { Conversation, Message } from '../../lib/types';
import { Alert, Avatar, Empty, Icon, PageHeader } from '../../components/ui';

const POLL_MS = 5000;
type Selection = number | 'broadcast' | null;

export const SupervisorMessages: React.FC = () => {
    const { profile } = useAuth();
    const [params, setParams] = useSearchParams();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Selection>(params.get('student') ? Number(params.get('student')) : null);
    const [thread, setThread] = useState<Message[]>([]);
    const [broadcasts, setBroadcasts] = useState<Message[]>([]);
    const [search, setSearch] = useState('');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loaded, setLoaded] = useState(false);

    const streamRef = useRef<HTMLDivElement>(null);
    const lastCount = useRef(0);

    const loadConversations = useCallback(async () => {
        try {
            setConversations(await api<Conversation[]>('/messages/conversations'));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoaded(true);
        }
    }, []);

    const loadPane = useCallback(async () => {
        if (selected === null) return;
        try {
            if (selected === 'broadcast') setBroadcasts(await api<Message[]>('/messages/broadcasts'));
            else setThread(await api<Message[]>(`/messages/thread?studentId=${selected}`));
        } catch (err) {
            setError(errorMessage(err));
        }
    }, [selected]);

    useEffect(() => {
        loadConversations();
        const t = setInterval(loadConversations, POLL_MS);
        return () => clearInterval(t);
    }, [loadConversations]);

    useEffect(() => {
        setThread([]);
        lastCount.current = 0;
        loadPane();
        const t = setInterval(loadPane, POLL_MS);
        return () => clearInterval(t);
    }, [loadPane]);

    const shownCount = selected === 'broadcast' ? broadcasts.length : thread.length;
    useEffect(() => {
        if (shownCount !== lastCount.current && streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
        }
        lastCount.current = shownCount;
    }, [shownCount]);

    const choose = (s: Selection) => {
        setSelected(s);
        setError('');
        setNotice('');
        setText('');
        if (s === null || s === 'broadcast') setParams({}, { replace: true });
        else setParams({ student: String(s) }, { replace: true });
    };

    const send = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const content = text.trim();
        if (!content || sending || selected === null) return;
        setSending(true);
        setError('');
        setNotice('');
        try {
            await api('/messages', {
                method: 'POST',
                body: selected === 'broadcast' ? { broadcast: true, content } : { student_id: selected, content },
            });
            setText('');
            if (selected === 'broadcast') setNotice(`Sent to ${conversations.length} student${conversations.length === 1 ? '' : 's'}.`);
            await Promise.all([loadPane(), loadConversations()]);
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

    const q = search.trim().toLowerCase();
    const list = conversations.filter((c) => !q || c.student.full_name.toLowerCase().includes(q) || c.student.email.toLowerCase().includes(q));
    const active = typeof selected === 'number' ? conversations.find((c) => c.student.id === selected) : null;
    const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);

    return (
        <>
            <PageHeader
                title="Messages"
                subtitle={totalUnread ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}` : 'Talk to your students one-to-one or send a notice to everyone.'}
            />

            <section className="card chat-split">
                <div className={`chat-list ${selected !== null ? 'hide-small' : ''}`}>
                    <div className="search search-block">
                        <Icon name="search" size={16} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" aria-label="Search students" />
                    </div>

                    <button className={`convo convo-broadcast ${selected === 'broadcast' ? 'on' : ''}`} onClick={() => choose('broadcast')}>
                        <span className="convo-icon"><Icon name="megaphone" size={18} /></span>
                        <div className="convo-text">
                            <strong>Announcement</strong>
                            <small>Message all your students</small>
                        </div>
                    </button>

                    <div className="convo-scroll">
                        {!loaded ? (
                            <p className="muted pad">Loading…</p>
                        ) : list.length === 0 ? (
                            <p className="muted pad small">{conversations.length ? 'No matches.' : 'No students assigned to you yet.'}</p>
                        ) : (
                            list.map((c) => (
                                <button key={c.student.id} className={`convo ${selected === c.student.id ? 'on' : ''}`} onClick={() => choose(c.student.id)}>
                                    <Avatar name={c.student.full_name} url={c.student.avatar_url} size={40} />
                                    <div className="convo-text">
                                        <strong>{c.student.full_name}</strong>
                                        <small>{c.last ? `${c.last.sender_id === profile?.id ? 'You: ' : ''}${c.last.content}` : 'No messages yet'}</small>
                                    </div>
                                    {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className={`chat-pane ${selected === null ? 'hide-small' : ''}`}>
                    {selected === null ? (
                        <Empty icon="message" title="Pick a conversation">
                            Choose a student on the left, or send an announcement to all of them.
                        </Empty>
                    ) : (
                        <>
                            <div className="chat-head">
                                <button className="icon-btn show-small" onClick={() => choose(null)} aria-label="Back to conversations">
                                    <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="chevron" size={20} /></span>
                                </button>
                                {selected === 'broadcast' ? (
                                    <>
                                        <span className="convo-icon"><Icon name="megaphone" size={18} /></span>
                                        <div>
                                            <strong>Announcement to all students</strong>
                                            <small>Every student assigned to you will see this in their chat.</small>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Avatar name={active?.student.full_name || '?'} url={active?.student.avatar_url} size={42} />
                                        <div>
                                            <strong>{active?.student.full_name}</strong>
                                            <small>{active?.student.email}</small>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="chat-stream" ref={streamRef}>
                                {selected === 'broadcast' ? (
                                    broadcasts.length === 0 ? (
                                        <Empty icon="megaphone" title="No announcements yet">Notices you send will be listed here.</Empty>
                                    ) : (
                                        [...broadcasts].reverse().map((m) => (
                                            <div key={m.id} className="bubble mine broadcast">
                                                <span className="bubble-tag"><Icon name="megaphone" size={12} /> Announcement</span>
                                                <p>{m.content}</p>
                                                <time>{formatTime(m.created_at)}</time>
                                            </div>
                                        ))
                                    )
                                ) : thread.length === 0 ? (
                                    <Empty icon="message" title="No messages yet">Send the first message below.</Empty>
                                ) : (
                                    thread.map((m) => (
                                        <div key={m.id} className={`bubble ${m.sender_id === profile?.id ? 'mine' : 'theirs'}`}>
                                            <p>{m.content}</p>
                                            <time>{formatTime(m.created_at)}</time>
                                        </div>
                                    ))
                                )}
                            </div>

                            {error && <Alert kind="error">{error}</Alert>}
                            {notice && <Alert kind="success">{notice}</Alert>}

                            <form className="composer" onSubmit={send}>
                                <textarea
                                    rows={1}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={onKey}
                                    maxLength={2000}
                                    placeholder={selected === 'broadcast' ? 'Write an announcement for all students…' : 'Write a message…'}
                                />
                                <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
                                    <Icon name="send" size={16} /> {selected === 'broadcast' ? 'Announce' : 'Send'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </section>
        </>
    );
};
