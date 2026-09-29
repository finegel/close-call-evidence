import { lookup, validateLookup } from '@/lib/archive';
let busy = false;
export async function GET(request: Request) {
  const url = new URL(request.url);
  let input;
  try {
    input = validateLookup(
      url.searchParams.get('n'),
      url.searchParams.get('q'),
    );
  } catch {
    return Response.json(
      {
        error: 'Invalid sweep or public identifier. Never enter private keys.',
      },
      { status: 400 },
    );
  }
  if (busy)
    return Response.json(
      { error: 'Another archive is being checked. Please retry shortly.' },
      { status: 429 },
    );
  busy = true;
  try {
    return Response.json(await lookup(input.n, input.q), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Archive unavailable' },
      { status: 502 },
    );
  } finally {
    busy = false;
  }
}
