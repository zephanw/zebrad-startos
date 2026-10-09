import { rm } from 'fs/promises'
import { storeJson } from './fileModels/store.json'
import { zebradToml } from './fileModels/zebrad.toml'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  BlockchainInfo,
  blocksBehind,
  lwdDataDir,
  lwdGrpcPort,
  lwdHttpPort,
  lwdUser,
  rpcPort,
  syncedThreshold,
  unsyncedThreshold,
  zebraConfPath,
  zebraDataDir,
  zebraRpc,
  zebraUser,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Zcash (Zebra)!'))

  // A reactive read re-runs setupMain, restarting the daemons, whenever
  // zebrad.toml changes (zebrad only reads it at launch).
  await zebradToml.read().const(effects)

  // lightwalletd takes CLI flags only; restart it when its settings change.
  const lwd = (await storeJson.read((s) => s.lightwalletd).const(effects)) ?? {
    enabled: true,
    donationAddress: null,
    logLevel: 4,
  }

  /**
   * ======================== Maintenance flags ========================
   * Raised by the maintenance actions, consumed here once.
   */
  const flags = await storeJson.read().once()

  if (flags?.resyncZebra) {
    // Zebra keeps chain state under <cache_dir>/state/; everything else on
    // the volume (zebrad.toml, the peer cache) survives the resync.
    await rm(`/media/startos/volumes/zebra/state`, {
      recursive: true,
      force: true,
    })
    await storeJson.merge(effects, { resyncZebra: false })
  }

  const redownload = !!flags?.redownloadLightwalletd
  if (redownload) {
    await storeJson.merge(effects, { redownloadLightwalletd: false })
  }

  /**
   * ======================== Subcontainers ========================
   */
  const zebraSub = sdk.SubContainer.of(
    effects,
    { imageId: 'zebra' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'zebra',
      subpath: null,
      mountpoint: zebraDataDir,
      readonly: false,
    }),
    'zebra',
  )

  const lwdSub = lwd.enabled
    ? sdk.SubContainer.of(
        effects,
        { imageId: 'lightwalletd' },
        sdk.Mounts.of().mountVolume({
          volumeId: 'lightwalletd',
          subpath: null,
          mountpoint: lwdDataDir,
          readonly: false,
        }),
        'lightwalletd',
      )
    : null

  /**
   * Hysteresis: once synced, zebrad stays "synced" until it trails the
   * estimated tip by unsyncedThreshold blocks. lightwalletd requires
   * 'sync-progress', so without this it would stop every time zebrad briefly
   * fell a few blocks behind.
   */
  let synced = false

  /**
   * ======================== Daemons ========================
   */
  return sdk.Daemons.of(effects)
    .addOneshot('chown-zebra', {
      subcontainer: zebraSub,
      exec: {
        command: ['chown', '-R', `${zebraUser}:${zebraUser}`, zebraDataDir],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('zebrad', {
      subcontainer: zebraSub,
      exec: {
        command: ['zebrad', '-c', zebraConfPath, 'start'],
        user: zebraUser,
        env: { HOME: '/home/zebra' },
      },
      ready: {
        display: i18n('Zebra Node'),
        gracePeriod: 120_000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, rpcPort, {
            successMessage: i18n('Zebra is running and its RPC is ready'),
            errorMessage: i18n('Zebra RPC is not responding'),
          }),
      },
      requires: ['chown-zebra'],
    })
    .addHealthCheck('sync-progress', {
      ready: {
        display: i18n('Blockchain Sync'),
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 5_000,
          failure: 10_000,
        }),
        fn: async () => {
          let info: BlockchainInfo
          try {
            info = await zebraRpc<BlockchainInfo>('getblockchaininfo')
          } catch {
            return {
              result: 'starting',
              message: i18n('Waiting for Zebra RPC…'),
            }
          }

          const behind = blocksBehind(info)
          synced = synced
            ? behind <= unsyncedThreshold
            : behind <= syncedThreshold

          if (synced) {
            return {
              result: 'success',
              message: i18n('Synced to block ${height}', {
                height: String(info.blocks),
              }),
            }
          }

          const percentage = (
            Math.min(info.verificationprogress, 1) * 100
          ).toFixed(2)
          return {
            result: 'loading',
            message: i18n(
              'Syncing: ${percentage}% (block ${height} of ~${target})',
              {
                percentage,
                height: String(info.blocks),
                target: String(info.estimatedheight),
              },
            ),
          }
        },
      },
      requires: ['zebrad'],
    })
    .addOneshot('chown-lightwalletd', () =>
      lwdSub
        ? {
            subcontainer: lwdSub,
            exec: {
              command: [
                'sh',
                '-c',
                `mkdir -p ${lwdDataDir}/db && chown -R ${lwdUser}:${lwdUser} ${lwdDataDir}`,
              ],
              user: 'root',
            },
            requires: [],
          }
        : null,
    )
    .addDaemon('lightwalletd', () =>
      lwdSub
        ? {
            subcontainer: lwdSub,
            exec: {
              command: [
                'lightwalletd',
                `--grpc-bind-addr=0.0.0.0:${lwdGrpcPort}`,
                `--http-bind-addr=127.0.0.1:${lwdHttpPort}`,
                // TLS is terminated by StartOS (interfaces.ts).
                '--no-tls-very-insecure',
                `--data-dir=${lwdDataDir}/db`,
                '--log-file=/dev/stdout',
                `--log-level=${lwd.logLevel}`,
                '--rpchost=127.0.0.1',
                `--rpcport=${rpcPort}`,
                // zebrad runs with cookie auth off; lightwalletd still only
                // uses these flags when user and password are both non-empty.
                '--rpcuser=zebra',
                '--rpcpassword=unused',
                ...(lwd.donationAddress
                  ? [`--donation-address=${lwd.donationAddress}`]
                  : []),
                ...(redownload ? ['--redownload'] : []),
              ],
              user: lwdUser,
            },
            ready: {
              display: i18n('Light Wallet Server'),
              gracePeriod: 60_000,
              fn: () =>
                sdk.healthCheck.checkPortListening(effects, lwdGrpcPort, {
                  successMessage: i18n('lightwalletd is serving light wallets'),
                  errorMessage: i18n('lightwalletd is not listening'),
                }),
            },
            // The Zebra book: lightwalletd needs a running zebrad with an
            // up-to-date chain before it syncs.
            requires: ['zebrad', 'sync-progress', 'chown-lightwalletd'],
          }
        : null,
    )
})
