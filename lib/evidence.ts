export const REFEREE =
  'did:key:z6MkowHQwsx9xr84WbWN3YCnKutyBnBXkT1ChKY4uEAAMzte';
export const ROOM = 'd-close1-pnl';
export async function boundedGet(url: string, maxBytes = 1_000_000) {
  return JSON.parse(
    new TextDecoder().decode(await boundedBytes(url, maxBytes)),
  );
}
export async function boundedBytes(url: string, maxBytes = 1_000_000) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok || !response.body)
    throw new Error('Public source unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      count += part.value.length;
      if (count > maxBytes) throw new Error('Source exceeds safety limit');
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export function refereeBytes() {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let number = BigInt(0);
  for (const char of REFEREE.slice(9)) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid pinned key');
    number = number * BigInt(58) + BigInt(index);
  }
  const bytes = [];
  while (number > BigInt(0)) {
    bytes.unshift(Number(number & BigInt(255)));
    number >>= BigInt(8);
  }
  if (bytes.length !== 34 || bytes[0] !== 237 || bytes[1] !== 1)
    throw new Error('Invalid pinned key');
  return new Uint8Array(bytes.slice(2));
}
export async function verifyEnvelope(message: unknown, room: string) {
  if (!message || typeof message !== 'object')
    throw new Error('Missing source message');
  const m = message as Record<string, unknown>;
  if (
    m.from !== REFEREE ||
    typeof m.text !== 'string' ||
    m.text.length > 16000 ||
    typeof m.sig !== 'string' ||
    !/^[A-Za-z0-9_-]{85}[AQgw]$/.test(m.sig)
  )
    throw new Error('Untrusted source message');
  if (
    !(
      typeof m.nonce === 'number' &&
      Number.isSafeInteger(m.nonce) &&
      m.nonce >= 0
    ) &&
    !(typeof m.nonce === 'string' && /^(0|[1-9][0-9]{0,39})$/.test(m.nonce))
  )
    throw new Error('Invalid nonce');
  const signature = Uint8Array.from(
    atob(m.sig.replace(/-/g, '+').replace(/_/g, '/') + '=='),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    'raw',
    refereeBytes(),
    { name: 'Ed25519' },
    false,
    ['verify'],
  );
  if (
    !(await crypto.subtle.verify(
      'Ed25519',
      key,
      signature,
      new TextEncoder().encode(`${room}|${m.nonce}|${m.text}`),
    ))
  )
    throw new Error('Referee signature verification failed');
  return {
    body: JSON.parse(m.text),
    received: typeof m.ts === 'string' ? m.ts : 'unknown',
  };
}
export async function verifyMessage(message: unknown) {
  const { body, received } = await verifyEnvelope(message, ROOM);
  const decimal = (s: unknown) =>
    typeof s === 'string' && /^-?[0-9]{1,20}(\.[0-9]{1,12})?$/.test(s);
  if (
    body.t !== 'pnl' ||
    !Number.isSafeInteger(body.n) ||
    body.n < 1 ||
    !decimal(body.mark) ||
    !Array.isArray(body.top) ||
    body.top.length > 100 ||
    !body.top.every(
      (entry: unknown) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        /^did:key:z6Mk[1-9A-HJ-NP-Za-km-z]{44}$/.test(entry[0]) &&
        decimal(entry[1]),
    )
  )
    throw new Error('Unsupported standings format');
  return {
    n: body.n,
    mark: body.mark,
    top: body.top,
    received,
    fetched: new Date().toISOString(),
  };
}
