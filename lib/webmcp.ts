export type ReadTool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
export type ModelContext = {
  registerTool: (
    tool: ReadTool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function publicFilter(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected an object');
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).some((key) => key !== 'query') ||
    typeof value.query !== 'string' ||
    value.query.length > 100 ||
    !/^[A-Za-z0-9:_-]*$/.test(value.query)
  )
    throw new Error('Expected a public DID fragment, up to 100 characters');
  return value.query;
}
