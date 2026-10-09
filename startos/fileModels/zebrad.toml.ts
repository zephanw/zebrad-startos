import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { healthPort, p2pPort, rpcPort, zebraDataDir } from '../utils'

/**
 * zebrad.toml, read by zebrad at start (`zebrad -c /data/zebrad.toml start`).
 *
 * zebrad parses every section with `deny_unknown_fields`, so only keys that
 * exist in Zebra's config structs may appear here. An unset optional key is
 * omitted and Zebra applies its own default; the actions only write what the
 * user changed. Field docs: https://docs.rs/zebrad/latest/zebrad/config/
 *
 * Literals are enforced on every read: network, listen addresses and data
 * paths are the package's contract with the interfaces and volumes.
 */

const optInt = z.number().int().min(0).optional().catch(undefined)
const optString = z.string().min(1).optional().catch(undefined)

const networkShape = z.looseObject({
  network: z.literal('Mainnet').catch('Mainnet'),
  listen_addr: z.literal(`[::]:${p2pPort}`).catch(`[::]:${p2pPort}`),
  // Peer address cache (`<cache_dir>/network/mainnet.peers`).
  cache_dir: z.literal(zebraDataDir).catch(zebraDataDir),
  initial_mainnet_peers: z.array(z.string()).optional().catch(undefined),
  peerset_initial_target_size: optInt,
  max_connections_per_ip: optInt,
})

const rpcShape = z.looseObject({
  listen_addr: z.literal(`0.0.0.0:${rpcPort}`).catch(`0.0.0.0:${rpcPort}`),
  // Off: zebrad's cookie rotates on every start, which lightwalletd (flags
  // read once at launch) and external clients cannot follow. The port is
  // reachable unauthenticated only inside the server; off-box clients go
  // through the StartOS proxy, which enforces basic auth (interfaces.ts).
  enable_cookie_auth: z.literal(false).catch(false),
  cookie_dir: z.literal(zebraDataDir).catch(zebraDataDir),
})

const stateShape = z.looseObject({
  cache_dir: z.literal(zebraDataDir).catch(zebraDataDir),
})

const syncShape = z.looseObject({
  download_concurrency_limit: optInt,
  checkpoint_verify_concurrency_limit: optInt,
  full_verify_concurrency_limit: optInt,
  parallel_cpu_threads: optInt,
})

const mempoolShape = z.looseObject({
  tx_cost_limit: optInt,
})

const miningShape = z.looseObject({
  miner_address: optString,
  miner_memo: optString,
})

const tracingShape = z.looseObject({
  use_color: z.literal(false).catch(false),
  filter: optString,
})

const healthShape = z.looseObject({
  listen_addr: z
    .literal(`127.0.0.1:${healthPort}`)
    .catch(`127.0.0.1:${healthPort}`),
})

export const shape = z.looseObject({
  network: networkShape.catch(() => networkShape.parse({})),
  rpc: rpcShape.catch(() => rpcShape.parse({})),
  state: stateShape.catch(() => stateShape.parse({})),
  sync: syncShape.catch(() => syncShape.parse({})),
  mempool: mempoolShape.catch(() => mempoolShape.parse({})),
  mining: miningShape.catch(() => miningShape.parse({})),
  tracing: tracingShape.catch(() => tracingShape.parse({})),
  health: healthShape.catch(() => healthShape.parse({})),
})

export type ZebradToml = z.infer<typeof shape>

export const zebradToml = FileHelper.toml(
  { base: sdk.volumes.zebra, subpath: 'zebrad.toml' },
  shape,
)
