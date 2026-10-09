// Ports, paths, ids, and the small JSON-RPC client shared across the package.

// ── Ports ──────────────────────────────────────────────────────────────
export const p2pPort = 8233
export const rpcPort = 8232
/** zebrad's /healthy + /ready endpoints. Loopback only, never bound. */
export const healthPort = 8080
/** lightwalletd's gRPC listener (plaintext h2c), and the external TLS port. */
export const lwdGrpcPort = 9067
/** External port for the plaintext (grpc://, .onion) lightwalletd address. */
export const lwdPlainPort = 9068
/** lightwalletd's HTTP (metrics) listener. Loopback only, never bound. */
export const lwdHttpPort = 9068

// ── Paths ──────────────────────────────────────────────────────────────
/** Where the `zebra` volume is mounted in the zebra subcontainer. */
export const zebraDataDir = '/data'
export const zebraConfPath = `${zebraDataDir}/zebrad.toml`
/** Where the `lightwalletd` volume is mounted in the lightwalletd subcontainer. */
export const lwdDataDir = '/data'

// The users the upstream images create.
export const zebraUser = 'zebra' // uid 10001
export const lwdUser = 'lightwalletd' // uid 2002

// ── Host / interface ids ───────────────────────────────────────────────
export const peerHostId = 'peer'
export const peerInterfaceId = 'peer'
export const rpcHostId = 'rpc'
export const rpcInterfaceId = 'rpc'
export const lwdHostId = 'lightwalletd'
export const lwdInterfaceId = 'lightwalletd'

/** Username the StartOS proxy expects on the RPC interface. */
export const rpcUsername = 'zebra'

/**
 * Zebra 6.4.2's built-in Mainnet DNS seeders (zebra-network/src/config.rs).
 * `initial_mainnet_peers` replaces this list wholesale, so user-added peers
 * are written alongside it, never instead of it.
 */
export const defaultMainnetPeers = [
  'dnsseed.str4d.xyz:8233',
  'dnsseed.z.cash:8233',
  'mainnet.seeder.shieldedinfra.net:8233',
  'mainnet.seeder.zfnd.org:8233',
]

// ── JSON-RPC ───────────────────────────────────────────────────────────

export type BlockchainInfo = {
  chain: string
  blocks: number
  estimatedheight: number
  verificationprogress: number
  bestblockhash: string
}

export type NetworkInfo = {
  version: number
  subversion: string
  connections: number
}

/**
 * Call zebrad's JSON-RPC from the StartOS container. zebrad listens on every
 * interface inside the service, so loopback reaches it; cookie auth is off
 * (see fileModels/zebrad.toml.ts), so no credentials are sent.
 */
export async function zebraRpc<T>(
  method: string,
  params: unknown[] = [],
  timeoutMs = 10_000,
): Promise<T> {
  const res = await fetch(`http://127.0.0.1:${rpcPort}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    throw new Error(`zebrad RPC ${method} returned HTTP ${res.status}`)
  }
  const body = (await res.json()) as {
    result?: T
    error?: { message?: string } | null
  }
  if (body.error) {
    throw new Error(`zebrad RPC ${method}: ${body.error.message ?? 'error'}`)
  }
  return body.result as T
}

/** Blocks between our tip and the estimated network tip. */
export const blocksBehind = (info: BlockchainInfo) =>
  Math.max(0, info.estimatedheight - info.blocks)

/**
 * Considered synced within this many blocks of the estimated tip. The
 * estimate is derived from the clock, so it drifts a few blocks either way.
 */
export const syncedThreshold = 10
/** Once synced, only this far behind counts as "syncing" again. */
export const unsyncedThreshold = 100
