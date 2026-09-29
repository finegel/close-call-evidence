import { boundedBytes, boundedGet, verifyEnvelope } from './evidence';
const BASE = 'https://challenges.technocore.chat/close-1/';
const HEX = /^[a-f0-9]{64}$/;
export function validateLookup(n: unknown, q: unknown) {
  if (
    typeof n !== 'string' ||
    !/^[1-9][0-9]{0,3}$/.test(n) ||
    Number(n) > 2556 ||
    typeof q !== 'string' ||
    !/^(did:key:z6Mk[1-9A-HJ-NP-Za-km-z]{44}|[A-Za-z0-9_-]{1,100})$/.test(q)
  )
    throw new Error(
      'Enter a sweep (1–2556) and a public DID or exact trade ID. Never enter keys.',
    );
  return { n: Number(n), q };
}
export type EvidenceRow = {
  id: string;
  side: string;
  qty: string;
  px: string;
  outcome: string;
  reason: string;
};
export async function lookup(n: number, q: string) {
  const index = await boundedGet(BASE + 'index.json');
  if (
    index.contest !== 'close-1' ||
    !Array.isArray(index.sweeps) ||
    index.sweeps.length > 3000
  )
    throw new Error('Unsupported archive index');
  const entry = index.sweeps.find((x: { n: number }) => x.n === n);
  if (!entry)
    throw new Error(
      'This sweep is not in the public archive. Its trades and balance remain unknown.',
    );
  if (
    !HEX.test(entry.file) ||
    !['full', 'redacted'].includes(entry.status) ||
    entry.path !==
      `${entry.status === 'full' ? 'sweeps' : 'redacted'}/${entry.file}.json` ||
    !Number.isSafeInteger(entry.bytes) ||
    entry.bytes < 1 ||
    entry.bytes > 8_000_000
  )
    throw new Error('Archive entry exceeds supported safety limits');
  const bytes = await boundedBytes(BASE + entry.path, 8_000_000);
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  const expected = entry.status === 'full' ? entry.file : entry.sha256;
  if (!HEX.test(expected) || hash !== expected || bytes.length !== entry.bytes)
    throw new Error('Archive hash or size mismatch');
  let provenance =
    'Redacted archive: hash matches unsigned index only; NOT referee-authenticated trade evidence.';
  if (entry.status === 'full') {
    const transcript = new TextDecoder().decode(
      await boundedBytes(
        'https://technocore.chat/r/d-close1-pnl/export',
        8_000_000,
      ),
    );
    let anchored = false;
    for (const line of transcript.split('\n')) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const candidate = JSON.parse(message.text);
      if (candidate.n !== n || candidate.file !== hash) continue;
      const { body } = await verifyEnvelope(message, 'd-close1-pnl');
      if (body.n === n && body.t === 'pnl' && body.file === hash) {
        anchored = true;
        break;
      }
    }
    if (!anchored)
      throw new Error('Cannot anchor this archive to a signed referee record');
    provenance = 'Full archive: SHA-256 matches a referee-signed P&L record.';
  }
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (
    record.input?.n !== n ||
    record.output?.sweep !== n ||
    !Array.isArray(record.input.trades) ||
    !Array.isArray(record.output.trades) ||
    record.input.trades.length !== record.output.trades.length
  )
    throw new Error('Unsupported archive structure');
  const rows: EvidenceRow[] = [];
  let total = 0;
  for (let i = 0; i < record.input.trades.length; i++) {
    const input = record.input.trades[i],
      output = record.output.trades[i];
    if (!input || !output || input.redacted || output.redacted) continue;
    if (![input.id, input.maker, input.countersigner, input.taker].includes(q))
      continue;
    if (input.id !== output.id)
      throw new Error('Trade/result identity mismatch');
    total++;
    if (rows.length < 100) {
      const field = (value: unknown) =>
        typeof value === 'string' && value.length <= 160 ? value : 'unknown';
      rows.push({
        id: field(input.id),
        side: field(input.side),
        qty: field(input.qty),
        px: field(input.px),
        outcome: field(output.outcome),
        reason: field(output.reason),
      });
    }
  }
  return {
    n,
    rows,
    total,
    truncated: total > 100,
    provenance,
    source: BASE + entry.path,
    archiveThrough: index.sweeps.at(-1)?.n,
    redacted: entry.status === 'redacted',
    note: 'Single-sweep evidence only. Quantities are proposed terms unless the outcome explicitly confirms settlement. No current balance can be inferred.',
  };
}
