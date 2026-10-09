import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

/** Raise a flag main.ts consumes on its next run, restarting now if running. */
async function flagAndRestart(
  effects: Parameters<typeof sdk.restart>[0],
  flag: 'resyncZebra' | 'redownloadLightwalletd',
) {
  await storeJson.merge(effects, { [flag]: true })
  const status = await sdk.getStatus(effects, { packageId: 'zebrad' }).once()
  if (status?.started) {
    await sdk.restart(effects)
    return true
  }
  return false
}

export const resyncBlockchain = sdk.Action.withoutInput(
  'resync-blockchain',

  async () => ({
    name: i18n('Delete Blockchain & Resync'),
    description: i18n(
      "Delete Zebra's chain state and download and verify the whole Zcash blockchain again. Use only if the database is corrupt.",
    ),
    warning: i18n(
      'Deletes all Zcash blockchain data. Re-syncing downloads roughly 300 GB and can take a day or more, during which the light wallet server is unavailable. Your settings and RPC password are kept.',
    ),
    allowedStatuses: 'any',
    group: i18n('Maintenance'),
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const restarted = await flagAndRestart(effects, 'resyncZebra')
    return {
      version: '1',
      title: i18n('Resync Scheduled'),
      message: restarted
        ? i18n('Restarting. The chain state is deleted before Zebra starts.')
        : i18n('The chain state will be deleted the next time Zebra starts.'),
      result: null,
    }
  },
)

export const rebuildLightwalletd = sdk.Action.withoutInput(
  'rebuild-lightwalletd',

  async ({ effects }) => ({
    name: i18n('Rebuild Light Wallet Cache'),
    description: i18n(
      'Make lightwalletd discard its compact-block cache and re-fetch every block from Zebra. Use if wallets report errors syncing from your server.',
    ),
    warning: i18n(
      'Restarts the service. Light wallets cannot sync from your server until lightwalletd has re-fetched the chain from Zebra, which can take several hours.',
    ),
    allowedStatuses: 'any',
    group: i18n('Maintenance'),
    visibility:
      (await storeJson.read((s) => s.lightwalletd.enabled).const(effects)) ===
      false
        ? 'hidden'
        : 'enabled',
  }),

  async ({ effects }) => {
    const restarted = await flagAndRestart(effects, 'redownloadLightwalletd')
    return {
      version: '1',
      title: i18n('Rebuild Scheduled'),
      message: restarted
        ? i18n('Restarting. lightwalletd will rebuild its cache.')
        : i18n('lightwalletd will rebuild its cache the next time it starts.'),
      result: null,
    }
  },
)
