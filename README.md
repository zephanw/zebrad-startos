<p align="center">
  <img src="icon.png" alt="Zcash (Zebra) Logo" width="21%">
</p>

# Zcash (Zebra) on StartOS

> Everything not listed in this document should behave the same as upstream
> Zebra and lightwalletd. If a feature, setting, or behavior is not mentioned
> here, the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

This package runs [Zebra](https://github.com/ZcashFoundation/zebra), the Zcash Foundation's Zcash full node, together with [lightwalletd](https://github.com/zcash/lightwalletd), the gRPC server that Zcash light wallets sync from.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Both components run from their upstream images, unmodified, with the package supplying the command line instead of the images' entrypoints.

| Subcontainer   | Image                         | Runs                                                                                     |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `zebra`        | `zfnd/zebra` (upstream)       | `zebrad -c /data/zebrad.toml start` as user `zebra` (uid 10001)                          |
| `lightwalletd` | `electriccoinco/lightwalletd` | `lightwalletd` with flags built in `main.ts`, as user `lightwalletd` (uid 2002)          |

- Architecture: **x86_64 only**. The lightwalletd image is published for amd64 only.
- The Zebra image's `entrypoint.sh` (which drops privileges with `setpriv` and sets `ZEBRA_*` env defaults) is bypassed; a `chown-zebra` oneshot fixes volume ownership instead, and `chown-lightwalletd` does the same for lightwalletd.
- No `ZEBRA_*` environment variables are set, so `zebrad.toml` is the only configuration source.

## Volume and Data Layout

Three volumes: one for package state and one per component.

| Volume         | Mounted at                    | Contents                                                                                     |
| -------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `startos`      | not mounted                   | `store.json` (RPC password, lightwalletd settings, maintenance flags)                        |
| `zebra`        | `/data` in `zebra`            | `zebrad.toml`, `state/` (RocksDB chain state, ~300 GB), `network/mainnet.peers` (peer cache) |
| `lightwalletd` | `/data` in `lightwalletd`     | `db/` (compact-block cache); an unused `tls.cert` / `tls.key` may remain from 6.4.2:1        |

## File Models

The package owns two files and writes no others.

**`zebrad.toml`** (TOML, `zebra` volume). Seeded on install by an empty merge and re-merged on every init, which fills missing keys and resets the enforced ones:

- Re-asserted on every init: `network.network = "Mainnet"`, `network.listen_addr = "[::]:8233"`, `network.cache_dir`, `rpc.listen_addr = "0.0.0.0:8232"`, `rpc.enable_cookie_auth = false`, `rpc.cookie_dir`, `state.cache_dir`, `tracing.use_color = false`, `health.listen_addr = "127.0.0.1:8080"`.
- Written by actions, otherwise left alone: `network.peerset_initial_target_size`, `network.max_connections_per_ip`, `network.initial_mainnet_peers`, `sync.*` concurrency limits and `parallel_cpu_threads`, `mempool.tx_cost_limit`, `tracing.filter`, `mining.miner_address`, `mining.miner_memo`. An action clearing a field removes the key, so Zebra's default applies.
- Hand edits to any other valid Zebra key survive (the model preserves unknown keys), but the file is re-serialized on the next write, so comments are lost. Zebra rejects unknown keys (`deny_unknown_fields`); a typo stops zebrad from starting.
- `initial_mainnet_peers` is only written when the user adds peers, and then always includes Zebra's four default DNS seeders, since setting the list replaces Zebra's defaults.

**`store.json`** (JSON, `startos` volume). Package state with no place in `zebrad.toml`: `rpcPassword`, `lightwalletd.{enabled, donationAddress, logLevel}`, and the one-shot flags `resyncZebra` / `redownloadLightwalletd`. lightwalletd has no config file; its settings become CLI flags.

lightwalletd serves plaintext gRPC; TLS is terminated by StartOS, so the package writes no certificate files.

Any change to `zebrad.toml` or to `store.json`'s `lightwalletd` section restarts the whole service.

## Dependencies

None.

## Network Access and Interfaces

Three interfaces; two are conditional.

| Interface id   | Type  | Port | Protocol                                   | Present when                    |
| -------------- | ----- | ---- | ------------------------------------------ | ------------------------------- |
| `peer`         | p2p   | 8233 | Zcash P2P, raw TCP                         | always                          |
| `lightwalletd` | api   | 9067 TLS / 9068 plain | gRPC (HTTP/2); plain addresses shown as `grpc://` | lightwalletd is enabled |
| `rpc`          | api   | 8232 | JSON-RPC over HTTP, HTTPS off-box          | an RPC password has been set    |

- **lightwalletd**: raw TCP binding with `addSsl` (`alpn: ['h2']`, no auth, no X-Forwarded headers). On the TLS port StartOS terminates TLS (device certificate, or Let's Encrypt on a public domain), answers ALPN `h2` itself and pipes bytes to lightwalletd's plaintext h2c listener (`--no-tls-very-insecure`). The plain port (`secure: { ssl: false }`) is published as `grpc://host:9068` and is what `.onion` addresses carry. Zodl compatibility (from its source): Android accepts `host:port` (TLS, system CAs only — user-installed CAs are not trusted), `grpc://host:port` (plaintext) and `.onion` (plaintext over its Tor); iOS accepts `host:port` (TLS via the platform trust store) only. Zodl's Tor setting routes server-info and tip queries through Tor, so a LAN address fails with gRPC status 14 while it is on.
- **rpc**: off-box access goes through the StartOS proxy with HTTP basic auth (`zebra` / the stored password). zebrad's own cookie auth is disabled, because the cookie rotates on every start and lightwalletd reads its credentials once at launch. Consequently anything on the server itself (other services, the bridge) can call zebrad's RPC on 8232 without credentials — including `stop` and `addnode`.
- zebrad's health endpoint (8080) and lightwalletd's HTTP/metrics listener (9068) are loopback-only and not bound.

## Installation and First-Run Flow

There is no setup step. Install seeds `zebrad.toml` and `store.json`, and Zebra begins syncing on first start. lightwalletd is held back (shown as waiting) until the `sync-progress` check reports synced, as the Zebra book requires a synced zebrad before lightwalletd syncs. The RPC interface does not exist until **Generate RPC Password** has been run.

## Actions

Configuration actions only write files; every save restarts the service. Each can be run with the service stopped or running.

- **Node Information** (`node-info`) — read-only; calls `getblockchaininfo` and `getnetworkinfo`. Needs zebrad running. Safe to repeat.
- **Peer Settings** (`peers-config`), **Sync & Performance** (`performance-config`), **Mining Settings** (`mining-config`) — write `zebrad.toml`. Use Sync & Performance when Zebra exhausts RAM or CPU during initial sync (lower the concurrency limits and CPU threads). Mining Settings matters only for `getblocktemplate` clients; an invalid address stops zebrad from starting.
- **Light Wallet Server Settings** (`lightwalletd-config`) — writes `store.json`. Disabling removes the lightwalletd daemon and interface but leaves its cache on disk.
- **Generate RPC Password** (`generate-rpc-password`) — generates a 32-character password, stores it, returns it once. First run creates the `rpc` interface; later runs rotate the password in place (old password rejected immediately). Does not restart the service.
- **Rebuild Light Wallet Cache** (`rebuild-lightwalletd`) — sets `redownloadLightwalletd`; on the next start lightwalletd runs once with `--redownload`, discarding and re-fetching its compact-block cache from Zebra (hours). Restarts the service if running. Hidden while lightwalletd is disabled. Use when wallets report sync errors that persist across restarts.
- **Delete Blockchain & Resync** (`resync-blockchain`) — sets `resyncZebra`; before the next start `main.ts` deletes `state/` on the `zebra` volume. Restarts the service if running. Destructive: a full re-sync (~300 GB, a day or more). Use only for a corrupt state database (zebrad crash-looping on RocksDB errors).

## Tasks

None. The service never waits on a prompt; its ordinary controls are always available.

## Health Checks

Two daemon readiness checks and one standalone check.

| Check id         | Display             | Probes                                                                 |
| ---------------- | ------------------- | ---------------------------------------------------------------------- |
| `zebrad`         | Zebra Node          | port 8232 listening; 120 s grace                                        |
| `sync-progress`  | Blockchain Sync     | `getblockchaininfo` every 30 s                                          |
| `lightwalletd`   | Light Wallet Server | port 9067 listening; 60 s grace; only when enabled                      |

- **Zebra Node failing** after the grace period means zebrad exited. The usual causes are an invalid `zebrad.toml` (unknown key, bad miner address — the log names the field) or a corrupt state database (resync).
- **Blockchain Sync** is `loading` with a percentage while `estimatedheight − blocks > 10`, and `success` once within 10 blocks. After reaching success it stays there until zebrad falls more than 100 blocks behind, so lightwalletd is not stopped by normal tip jitter. `estimatedheight` comes from the clock, so a wrong server clock skews it.
- **Light Wallet Server waiting** is normal until Blockchain Sync succeeds. Listening means the gRPC server is up; lightwalletd may still be ingesting blocks, and wallets can see a lagging tip until it catches up.

## Backups and Restore

Volumes are copied wholesale (`ofVolumes('startos', 'zebra', 'lightwalletd')`) with the rebuildable parts excluded: `state/`, `network/`, `.cookie`, `db/`, `tls.cert`, `tls.key`. A backup therefore holds `zebrad.toml` and `store.json` only. A restored instance keeps its settings and RPC password, and re-syncs the whole chain before lightwalletd starts and rebuilds its cache.

## Limitations and Differences

1. Mainnet only; `network.network` is enforced.
2. x86_64 only, because the lightwalletd image is published for amd64 only.
3. zebrad's cookie authentication is off; off-box RPC is protected by proxy basic auth instead, and on-box clients are unauthenticated.
4. The chain state is not backed up.
5. Zebra's built-in lightwalletd-compatible gRPC server, Prometheus metrics, OpenTelemetry, Elasticsearch, the internal miner and the zcashd-compat sidecar are not exposed.
6. Comments in `zebrad.toml` are not preserved across writes.

---

## Quick Reference for AI Consumers

```yaml
package_id: zebrad
image: [zfnd/zebra, electriccoinco/lightwalletd]
architectures: [x86_64]
subcontainers: [zebra, lightwalletd]
volumes:
  startos: (not mounted)
  zebra: /data
  lightwalletd: /data
file_models:
  - zebra:zebrad.toml
  - startos:store.json
startos_managed_env_vars:
  - HOME
dependencies: none
interfaces:
  peer: { type: p2p, port: 8233 }
  lightwalletd: { type: api, port: 9067 }
  rpc: { type: api, port: 8232 }
actions:
  - node-info
  - peers-config
  - performance-config
  - lightwalletd-config
  - mining-config
  - generate-rpc-password
  - rebuild-lightwalletd
  - resync-blockchain
tasks: none
health_checks:
  - zebrad
  - sync-progress
  - lightwalletd
```
