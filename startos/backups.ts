import { sdk } from './sdk'

// Only what re-downloads or regenerates is excluded: the chain state and peer
// cache (zebra), the compact-block cache (lightwalletd), and the unused TLS
// pair left by 6.4.2:1. A restore keeps the
// settings and the RPC password, then re-syncs the chain.
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('startos', 'zebra', 'lightwalletd').setOptions({
    exclude: [
      // zebra
      'state/',
      'network/',
      '.cookie',
      // lightwalletd
      'db/',
      'tls.cert',
      'tls.key',
    ],
  }),
)
