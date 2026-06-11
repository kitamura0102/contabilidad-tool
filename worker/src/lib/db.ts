import { neon } from '@neondatabase/serverless'

export function getDb(databaseUrl: string) {
  return neon(databaseUrl)
}

// Runs queries inside a transaction with the Clerk user ID set for RLS.
// All subsequent queries in the array see current_setting('app.current_user_id').
export async function withUser<T>(
  sql: ReturnType<typeof neon>,
  userId: string,
  query: Parameters<typeof sql.transaction>[0]
): Promise<T> {
  const results = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    ...(Array.isArray(query) ? query : [query]),
  ] as Parameters<typeof sql.transaction>[0])

  // results[0] is the set_config row, results[1] is the first real query
  return (results as unknown[])[1] as T
}

// Normalize RNC: strip dashes and spaces (thermal receipts print as 1-31-78939-2)
export function normalizeRnc(raw: string): string {
  return raw.replace(/[-\s]/g, '')
}

// Convert decimal string to BIGINT cents ("5000.00" → 500000n)
export function toCents(value: string): bigint {
  const [intPart, decPart = '00'] = value.replace(/,/g, '').split('.')
  const dec = decPart.padEnd(2, '0').slice(0, 2)
  return BigInt(intPart) * 100n + BigInt(dec)
}

// Format BIGINT cents back to "5000.00"
export function fromCents(cents: bigint | number): string {
  const n = typeof cents === 'number' ? BigInt(cents) : cents
  const abs = n < 0n ? -n : n
  const intPart = abs / 100n
  const decPart = (abs % 100n).toString().padStart(2, '0')
  return (n < 0n ? '-' : '') + intPart.toString() + '.' + decPart
}
