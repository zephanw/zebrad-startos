# Zcash

Zebra starts downloading and verifying the Zcash blockchain as soon as you start the service. The first sync downloads roughly 300 GB and usually takes a day or more; the light wallet server comes online by itself once it finishes.

## Documentation

- [Zebra user guide](https://github.com/ZcashFoundation/zebra/tree/main/book/src/user) — the Zebra book's chapters on running, configuring, syncing, mining and troubleshooting a node.
- [lightwalletd README](https://github.com/zcash/lightwalletd/blob/master/README.md) — what the light wallet server does and how wallets talk to it.

## What you get on StartOS

- **A Zcash full node (Zebra)** that downloads, verifies and relays every block and transaction, then stays in sync.
- **A light wallet server (lightwalletd)** so Zashi, Ywallet, Zingo and other light wallets can sync from your own node instead of a public server.
- **A JSON-RPC interface**, protected by a password you generate, for block explorers, mining software and other tools.
- **Settings through actions** — peers, sync performance, mining, and the light wallet server — instead of hand-editing `zebrad.toml`.

## Getting set up

1. **Start the service** and open its **Dashboard** tab. The **Blockchain Sync** check shows the percentage and current block height.
2. **Wait for the sync to finish.** Until then the **Light Wallet Server** check reads as waiting; that is expected. Once Zebra catches up, lightwalletd starts and spends a while longer building its own cache before wallets can use it.
3. **Connect a wallet** (see below).

Zebra's developers recommend 16 GB of RAM (4 GB minimum) and at least 300 GB of free disk, which keeps growing with the chain.

## Using Zcash

### Connecting a light wallet

Wait until the **Light Wallet Server** check on the **Dashboard** is green. Until then every wallet reports a connection error (Zodl shows "communication failure", details 14).

The **Light Wallet Server** interface lists two kinds of address. Pick the one that fits your phone:

- **Android Zodl on your home Wi-Fi (simplest):** copy the address that starts with `grpc://`, for example `grpc://192.168.1.10:9068`. In Zodl, go to **Advanced Settings → Choose a Server → custom**, paste it including `grpc://`, and save. Use the IP-address version, not `.local`.
- **iPhone Zodl on your home Wi-Fi:** copy the address without `grpc://`, for example `192.168.1.10:9067`, and enter it as a custom server. The iPhone must trust your server's Root CA first: install it and turn on full trust for it, as you would for any StartOS service.
- **Away from home, any phone:** add a public domain to the **Light Wallet Server** interface. It gets a Let's Encrypt certificate every phone trusts; enter `yourdomain:port` in the wallet.
- **Android Zodl over Tor:** with the Tor service installed, add an onion address to the **Light Wallet Server** interface and enter its `.onion` address and port (the `grpc://` one) in Zodl, with Tor turned on in Zodl. iPhone Zodl does not support `.onion` servers.

If Zodl's own **Tor** setting is on, turn it off when using a home-network address: Zodl then sends some requests through Tor, which cannot reach a `192.168.x.x` address. Zodl accepts any port, so the port does not need to be 443.

### RPC access

The RPC interface does not appear until you create its credentials:

1. Run **Generate RPC Password**. It shows a username (`zebra`) and a password; save the password somewhere safe.
2. The **RPC** interface now appears on the **Dashboard**. Point your tool at that address and log in with HTTP basic auth using those credentials.

Running **Generate RPC Password** again replaces the password; tools using the old one stop working until you update them. Other services on your server can reach Zebra's RPC on port 8232 without a password.

### Settings

All settings are optional; leave a field empty to keep Zebra's default. Saving any of them restarts the node.

- **Peer Settings** — how many peers to connect to, connections allowed per IP, and extra peers or seed nodes to add.
- **Sync & Performance** — CPU threads, download and verification concurrency, mempool size and log level. Lower these if Zebra crowds out other services or runs your server out of memory.
- **Light Wallet Server Settings** — turn lightwalletd off if you don't use light wallets, set a donation address that is shown to wallets connecting to your server, and change its log level.
- **Mining Settings** — the payout address (and optional memo) Zebra puts in block templates for mining software that uses this node's RPC.

### Other actions

- **Node Information** — Zebra's version, connected peers, block height, estimated network height and sync progress.
- **Rebuild Light Wallet Cache** — if wallets get errors syncing from your server, this makes lightwalletd re-fetch every block from Zebra. Wallets can't use your server for the few hours that takes.
- **Delete Blockchain & Resync** — deletes Zebra's chain data and syncs again from scratch. Only for a corrupted database; it takes as long as the first sync.

## Limitations

- **Backups do not include the blockchain.** A restored server keeps your settings and RPC password but downloads and verifies the chain again.
- **Mainnet only.** Testnet and regtest are not offered.
