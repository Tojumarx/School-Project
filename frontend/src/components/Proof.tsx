import React, { useState } from 'react';
import { api, downloadFile, errorMessage } from '../lib/api';
import { formatTime } from '../lib/dates';
import type { EntryAnchor, ProofRecord, ProofReport } from '../lib/types';
import { Alert, Icon } from './ui';

const ANCHOR_LABEL: Record<string, string> = {
    confirmed: 'On Bitcoin',
    pending: 'Anchoring…',
    queued: 'Queued for blockchain',
};

/** Small badge showing whether the entry is anchored to the Bitcoin blockchain yet. */
export const AnchorBadge: React.FC<{ anchor?: EntryAnchor | null }> = ({ anchor }) => {
    if (!anchor) return null;
    const title =
        anchor.status === 'confirmed'
            ? `Anchored in Bitcoin block ${anchor.bitcoin_height}`
            : 'Submitted to OpenTimestamps; Bitcoin confirmation usually takes a few hours';
    return (
        <span className={`anchor-badge anchor-${anchor.status}`} title={title}>
            <Icon name={anchor.status === 'confirmed' ? 'shield-check' : 'shield'} size={12} />
            {ANCHOR_LABEL[anchor.status]}
        </span>
    );
};

const VERDICT = {
    intact: {
        icon: 'shield-check',
        title: 'Record verified',
        text: 'This log matches the fingerprint anchored on the blockchain. It has not been changed since it was recorded.',
    },
    tampered: {
        icon: 'alert',
        title: 'Record does not match its blockchain proof',
        text: 'This log was changed after it was anchored. Treat it as unreliable and contact the administrator.',
    },
    unanchored: {
        icon: 'shield',
        title: 'Not anchored yet',
        text: 'A blockchain proof for this log will be created shortly.',
    },
} as const;

const ProofItem: React.FC<{ entryId: number; proof: ProofRecord }> = ({ entryId, proof }) => {
    const [error, setError] = useState('');
    const download = () =>
        downloadFile(
            `/entries/${entryId}/proofs/${proof.id}/ots`,
            `siwes-log-${entryId}-${proof.kind}-${proof.id}.ots`,
        ).catch((e) => setError(errorMessage(e)));

    return (
        <li className="proof-item">
            <div className="proof-item-top">
                <strong>
                    {proof.kind === 'submission' ? 'Submission' : 'Supervisor review'}
                    {!proof.current && <span className="muted"> (earlier version)</span>}
                </strong>
                <AnchorBadge anchor={proof} />
            </div>
            <span className="muted">
                Recorded {formatTime(proof.recorded_at)}
                {proof.confirmed_at && ` · Bitcoin block ${proof.bitcoin_height}, ${formatTime(proof.confirmed_at)}`}
            </span>
            <span className="proof-hash">SHA-256 {proof.hash}</span>
            {proof.problems.map((p) => (
                <span key={p} className="proof-problem">{p}</span>
            ))}
            {proof.has_ots && (
                <div>
                    <button className="btn btn-ghost btn-sm" onClick={download}>
                        <Icon name="download" size={14} /> Download .ots proof
                    </button>
                </div>
            )}
            {error && <Alert kind="error">{error}</Alert>}
        </li>
    );
};

/** "Verify" button that checks an entry against its OpenTimestamps proofs and shows the result. */
export const ProofCheck: React.FC<{ entryId: number }> = ({ entryId }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ProofReport | null>(null);
    const [error, setError] = useState('');

    const verify = () => {
        setOpen(true);
        setLoading(true);
        setError('');
        api<ProofReport>(`/entries/${entryId}/proof`)
            .then(setReport)
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setLoading(false));
    };

    if (!open) {
        return (
            <button className="btn btn-ghost btn-sm" onClick={verify}>
                <Icon name="shield" size={14} /> Verify
            </button>
        );
    }

    const verdict = report ? VERDICT[report.integrity] : null;
    return (
        <div className="proof-panel">
            {loading ? (
                <p className="proof-help">Checking the blockchain proof…</p>
            ) : error ? (
                <Alert kind="error">{error}</Alert>
            ) : (
                report &&
                verdict && (
                    <>
                        <div className={`proof-verdict proof-${report.integrity}`}>
                            <Icon name={verdict.icon} size={20} />
                            <div>
                                <strong>{verdict.title}</strong>
                                <p>{verdict.text}</p>
                            </div>
                        </div>
                        {report.proofs.length > 0 && (
                            <ul className="proof-list">
                                {[...report.proofs].reverse().map((p) => (
                                    <ProofItem key={p.id} entryId={entryId} proof={p} />
                                ))}
                            </ul>
                        )}
                        <p className="proof-help small">
                            Proofs are anchored to Bitcoin through OpenTimestamps. Anyone can check a downloaded
                            .ots file independently at opentimestamps.org.
                        </p>
                    </>
                )
            )}
            <div>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
                {!loading && (
                    <button className="btn btn-ghost btn-sm" onClick={verify}>
                        <Icon name="refresh" size={14} /> Check again
                    </button>
                )}
            </div>
        </div>
    );
};
