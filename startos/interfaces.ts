import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  lwdGrpcPort,
  lwdHostId,
  lwdInterfaceId,
  lwdPlainPort,
  p2pPort,
  peerHostId,
  peerInterfaceId,
  rpcHostId,
  rpcInterfaceId,
  rpcPort,
  rpcUsername,
} from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const receipts = []

  // ── Peer (Zcash P2P, raw TCP) ──
  const peerOrigin = await sdk.MultiHost.of(effects, peerHostId).bindPort(
    p2pPort,
    {
      protocol: null,
      addSsl: null,
      preferredExternalPort: p2pPort,
      secure: { ssl: false },
    },
  )
  receipts.push(
    await peerOrigin.export([
      sdk.createInterface(effects, {
        name: i18n('Peer'),
        id: peerInterfaceId,
        description: i18n(
          'Accepts inbound connections from other Zcash nodes. Only useful once you make it reachable from outside your network.',
        ),
        type: 'p2p',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '',
        query: {},
      }),
    ]),
  )

  // ── lightwalletd (gRPC for light wallets) ──
  // lightwalletd serves plaintext gRPC (h2c). StartOS terminates TLS on the
  // SSL port and, with no auth or X-Forwarded headers, pipes the raw bytes
  // through (start-core net/vhost.rs) — so it can answer ALPN `h2` itself,
  // which gRPC clients require and http-protocol termination (http/1.1)
  // would not give. The plain port serves wallets that speak plaintext gRPC:
  // Zodl on Android accepts `grpc://host:port`, and uses plaintext for
  // `.onion` hosts (Tor already encrypts). iOS Zodl only speaks TLS.
  const lwdEnabled = await storeJson
    .read((s) => s.lightwalletd.enabled)
    .const(effects)
  if (lwdEnabled !== false) {
    const lwdOrigin = await sdk.MultiHost.of(effects, lwdHostId).bindPort(
      lwdGrpcPort,
      {
        protocol: null,
        preferredExternalPort: lwdPlainPort,
        secure: { ssl: false },
        addSsl: {
          alpn: ['h2'],
          auth: null,
          preferredExternalPort: lwdGrpcPort,
          addXForwardedHeaders: false,
        },
      },
    )
    receipts.push(
      await lwdOrigin.export([
        sdk.createInterface(effects, {
          name: i18n('Light Wallet Server'),
          id: lwdInterfaceId,
          description: i18n(
            'lightwalletd for Zodl, Zashi, Ywallet, Zingo and other light wallets. Use a host:port address (TLS) as a custom server; on Android Zodl you can also use a grpc:// address on your home network, or the .onion address with Tor.',
          ),
          type: 'api',
          masked: false,
          schemeOverride: { ssl: null, noSsl: 'grpc' },
          username: null,
          path: '',
          query: {},
        }),
      ]),
    )
  }

  // ── JSON-RPC ──
  // Exported only once a password exists, and only behind the proxy's basic
  // auth. Rotation deletes nothing (merge overwrites in place), so a plain
  // .const() never sees a gap.
  const rpcPassword = await storeJson.read((s) => s.rpcPassword).const(effects)
  if (rpcPassword) {
    const rpcOrigin = await sdk.MultiHost.of(effects, rpcHostId).bindPort(
      rpcPort,
      {
        protocol: 'http',
        preferredExternalPort: rpcPort,
        addSsl: {
          auth: {
            type: 'basic',
            credentials: [{ username: rpcUsername, password: rpcPassword }],
            realm: 'Zebra RPC',
          },
        },
      },
    )
    receipts.push(
      await rpcOrigin.export([
        sdk.createInterface(effects, {
          name: i18n('RPC'),
          id: rpcInterfaceId,
          description: i18n(
            "Zebra's JSON-RPC API, protected by the username and password from the Generate RPC Password action.",
          ),
          type: 'api',
          masked: false,
          schemeOverride: null,
          username: rpcUsername,
          path: '',
          query: {},
        }),
      ]),
    )
  }

  return receipts
})
