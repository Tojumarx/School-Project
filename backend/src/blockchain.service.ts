import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import OpenTimestamps from 'opentimestamps';
import { PrismaService } from './prisma.service';

type ProofKind = 'submission' | 'review';

type EntryLike = {
  id: number;
  user_id: number | null;
  student_email: string;
  date: string;
  description: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  status: string;
  supervisor_comment: string | null;
  reviewed_at: Date | null;
};

type ProofRow = {
  id: number;
  created_at: Date;
  kind: string;
  hash: string;
  snapshot: any;
  ots: Uint8Array | null;
  status: string;
  bitcoin_height: number | null;
  confirmed_at: Date | null;
};

const SWEEP_MS = Number(process.env.OTS_SWEEP_MS) || 10 * 60 * 1000;
const BATCH = 25;
const ESPLORA_TIMEOUT_MS = 10_000;

/** JSON with sorted keys, so the same data always hashes the same way (JSONB reorders keys). */
function canonical(value: any): string {
  if (value === null || value === undefined || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
    .join(',')}}`;
}

// The library console.logs every calendar it talks to; Nest's Logger writes to stdout directly, so it stays audible
let quietDepth = 0;
const originalLog = console.log;
async function quiet<T>(work: () => Promise<T>): Promise<T> {
  if (quietDepth++ === 0) console.log = () => undefined;
  try {
    return await work();
  } finally {
    if (--quietDepth === 0) console.log = originalLog;
  }
}

const sha256 = (snapshot: object) => createHash('sha256').update(canonical(snapshot)).digest('hex');

/**
 * Anchors log entries to the Bitcoin blockchain with OpenTimestamps.
 *
 * Every submission and every supervisor review is reduced to a SHA-256 hash and sent to the public
 * OpenTimestamps calendars, which commit it into a Bitcoin transaction within a few hours. After that,
 * nobody (not even someone with database access) can backdate a log or quietly edit an approved one
 * without the recomputed hash failing to match the anchored proof.
 */
@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);
  private timer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.OTS_DISABLED === 'true') return;
    this.timer = setInterval(() => void this.sweep(), SWEEP_MS);
    setTimeout(() => void this.sweep(), 15_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ---------- snapshots ----------
  submissionSnapshot(entry: EntryLike) {
    return {
      v: 1,
      kind: 'submission',
      entry_id: entry.id,
      user_id: entry.user_id,
      student_email: entry.student_email,
      date: entry.date,
      description: entry.description,
      image_url: entry.image_url,
      latitude: entry.latitude,
      longitude: entry.longitude,
      location_name: entry.location_name,
    };
  }

  reviewSnapshot(entry: EntryLike, submissionHash: string, reviewerId: number | null) {
    return {
      v: 1,
      kind: 'review',
      entry_id: entry.id,
      submission_hash: submissionHash,
      reviewer_id: reviewerId,
      status: entry.status,
      supervisor_comment: entry.supervisor_comment,
      reviewed_at: entry.reviewed_at ? entry.reviewed_at.toISOString() : null,
    };
  }

  // ---------- recording ----------
  /** Records a proof of the entry as just submitted. Never throws; the sweep retries anything missed. */
  async recordSubmission(entry: EntryLike) {
    await this.record(entry.id, 'submission', this.submissionSnapshot(entry));
  }

  /** Records a proof of the supervisor's decision, chained to the submission it was made on. */
  async recordReview(entry: EntryLike, reviewerId: number | null) {
    const submission = await this.latest(entry.id, 'submission');
    if (!submission) return; // the sweep anchors the submission first, then the review
    await this.record(entry.id, 'review', this.reviewSnapshot(entry, submission.hash, reviewerId));
  }

  private async record(entryId: number, kind: ProofKind, snapshot: object) {
    try {
      const proof = await this.prisma.entryProof.create({
        data: { entry_id: entryId, kind, hash: sha256(snapshot), snapshot },
      });
      // Calendars can take a second or two; don't hold up the user's request
      void this.stamp(proof);
    } catch (err: any) {
      this.logger.error(`Could not record ${kind} proof for entry ${entryId}: ${err.message}`);
    }
  }

  private latest(entryId: number, kind: ProofKind) {
    return this.prisma.entryProof.findFirst({ where: { entry_id: entryId, kind }, orderBy: { id: 'desc' } });
  }

  // ---------- OpenTimestamps ----------
  private async stamp(proof: { id: number; hash: string }) {
    try {
      const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        Array.from(Buffer.from(proof.hash, 'hex')),
      );
      await quiet(() => OpenTimestamps.stamp(detached));
      await this.prisma.entryProof.update({
        where: { id: proof.id },
        data: { ots: Buffer.from(detached.serializeToBytes()), status: 'pending', last_checked_at: new Date() },
      });
    } catch (err: any) {
      this.logger.warn(`Stamping proof ${proof.id} failed, will retry: ${err.message}`);
    }
  }

  /** Asks the calendars whether the proof has made it into a Bitcoin block yet. */
  private async upgrade(proof: { id: number; ots: Uint8Array | null }) {
    if (!proof.ots) return;
    try {
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(Buffer.from(proof.ots));
      const changed = await quiet(() => OpenTimestamps.upgrade(detached));
      const data: Record<string, any> = { last_checked_at: new Date() };
      if (changed) data.ots = Buffer.from(detached.serializeToBytes());

      if (detached.timestamp.isTimestampComplete()) {
        const result = await quiet<any>(() =>
          OpenTimestamps.verifyTimestamp(detached.timestamp, { ignoreBitcoinNode: true, timeout: ESPLORA_TIMEOUT_MS }),
        );
        if (result?.bitcoin) {
          data.status = 'confirmed';
          data.bitcoin_height = result.bitcoin.height;
          data.confirmed_at = new Date(result.bitcoin.timestamp * 1000);
        }
      }
      await this.prisma.entryProof.update({ where: { id: proof.id }, data });
    } catch (err: any) {
      this.logger.warn(`Upgrading proof ${proof.id} failed, will retry: ${err.message}`);
    }
  }

  /** Background job: anchor older entries, retry failed stamps, and upgrade pending proofs. */
  async sweep() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const unanchored = await this.prisma.entry.findMany({
        where: { proofs: { none: { kind: 'submission' } } },
        take: BATCH,
      });
      for (const entry of unanchored) await this.recordSubmission(entry);

      const unreviewed = await this.prisma.entry.findMany({
        where: {
          status: { in: ['Approved', 'Rejected'] },
          reviewed_at: { not: null },
          proofs: { some: { kind: 'submission' }, none: { kind: 'review' } },
        },
        include: { user: { select: { supervisor_id: true } } },
        take: BATCH,
      });
      for (const entry of unreviewed) await this.recordReview(entry, entry.user?.supervisor_id ?? null);

      const queued = await this.prisma.entryProof.findMany({
        where: { status: 'queued', created_at: { lt: new Date(Date.now() - 60_000) } },
        take: BATCH,
      });
      for (const proof of queued) await this.stamp(proof);

      const pending = await this.prisma.entryProof.findMany({
        where: { status: 'pending' },
        orderBy: { last_checked_at: 'asc' },
        take: BATCH,
      });
      for (const proof of pending) await this.upgrade(proof);
    } catch (err: any) {
      this.logger.error(`Blockchain sweep failed: ${err.message}`);
    } finally {
      this.sweeping = false;
    }
  }

  // ---------- verification ----------
  /** Whether the stored .ots file really commits to the stored hash (null when not stamped yet). */
  private otsMatches(proof: ProofRow) {
    if (!proof.ots) return null;
    try {
      const detached = OpenTimestamps.DetachedTimestampFile.deserialize(Buffer.from(proof.ots));
      return Buffer.from(detached.timestamp.msg).toString('hex') === proof.hash;
    } catch {
      return false;
    }
  }

  /**
   * Re-hashes the entry as it is in the database right now and compares it with the anchored proofs.
   * "tampered" means the current record no longer matches what was anchored on the blockchain.
   */
  async verifyEntry(entry: EntryLike) {
    // Give pending proofs a chance to pick up their Bitcoin confirmation before reporting
    const waiting = await this.prisma.entryProof.findMany({ where: { entry_id: entry.id, status: 'pending' } });
    await Promise.race([
      Promise.all(waiting.map((p) => this.upgrade(p))),
      new Promise((resolve) => setTimeout(resolve, 8_000)),
    ]);

    const proofs: ProofRow[] = await this.prisma.entryProof.findMany({
      where: { entry_id: entry.id },
      orderBy: { id: 'asc' },
    });
    const newest = (kind: ProofKind) => [...proofs].reverse().find((p) => p.kind === kind);
    const submission = newest('submission');
    // A review only counts for the submission it was made on; a resubmission starts a fresh review
    const latestReview = newest('review');
    const review = submission && latestReview && latestReview.id > submission.id ? latestReview : undefined;

    const report = proofs.map((p) => {
      const problems: string[] = [];
      if (sha256(p.snapshot) !== p.hash) problems.push('Stored snapshot does not match its hash');
      if (this.otsMatches(p) === false) problems.push('Blockchain proof does not commit to this hash');

      if (p === submission && sha256(this.submissionSnapshot(entry)) !== p.hash) {
        problems.push('Log content was changed after it was anchored');
      }
      if (p === review) {
        if (entry.status === 'Pending') {
          problems.push('Review decision was removed after it was anchored');
        } else if (sha256(this.reviewSnapshot(entry, submission!.hash, p.snapshot?.reviewer_id ?? null)) !== p.hash) {
          problems.push('Review decision was changed after it was anchored');
        }
      }

      return {
        id: p.id,
        kind: p.kind,
        current: p === submission || p === review,
        hash: p.hash,
        status: p.status,
        recorded_at: p.created_at,
        bitcoin_height: p.bitcoin_height,
        confirmed_at: p.confirmed_at,
        has_ots: !!p.ots,
        problems,
      };
    });

    const current = report.filter((r) => r.current);
    return {
      entry_id: entry.id,
      integrity: !submission ? 'unanchored' : report.some((r) => r.problems.length) ? 'tampered' : 'intact',
      anchor: !submission
        ? 'none'
        : current.every((r) => r.status === 'confirmed')
          ? 'confirmed'
          : current.some((r) => r.status === 'queued')
            ? 'queued'
            : 'pending',
      proofs: report,
    };
  }

  async otsFile(entryId: number, proofId: number) {
    const proof = await this.prisma.entryProof.findFirst({ where: { id: proofId, entry_id: entryId } });
    return proof?.ots ? { proof, bytes: Buffer.from(proof.ots) } : null;
  }

  /** Small per-entry summary for list views: the state of the latest submission's anchor. */
  static summarize(proofs: Array<{ kind: string; status: string; bitcoin_height: number | null; confirmed_at: Date | null }>) {
    const latest = proofs.find((p) => p.kind === 'submission');
    return latest ? { status: latest.status, bitcoin_height: latest.bitcoin_height, confirmed_at: latest.confirmed_at } : null;
  }
}
