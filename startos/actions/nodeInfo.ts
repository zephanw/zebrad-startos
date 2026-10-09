import { T } from '@start9labs/start-sdk'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { BlockchainInfo, blocksBehind, NetworkInfo, zebraRpc } from '../utils'

const single = (
  name: string,
  value: string,
  description: string | null = null,
  copyable = false,
): T.ActionResultMember => ({
  type: 'single',
  name,
  description,
  value,
  copyable,
  masked: false,
  qr: false,
})

export const nodeInfo = sdk.Action.withoutInput(
  'node-info',

  async () => ({
    name: i18n('Node Information'),
    description: i18n(
      'Show Zebra version, peer count, block height and sync progress.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  async () => {
    const [chain, net] = await Promise.all([
      zebraRpc<BlockchainInfo>('getblockchaininfo'),
      zebraRpc<NetworkInfo>('getnetworkinfo'),
    ])

    const progress = (Math.min(chain.verificationprogress, 1) * 100).toFixed(2)

    return {
      version: '1',
      title: i18n('Node Information'),
      message: null,
      result: {
        type: 'group',
        value: [
          single(i18n('Version'), net.subversion),
          single(i18n('Network'), chain.chain),
          single(
            i18n('Connected Peers'),
            String(net.connections),
            i18n('Peers Zebra is currently connected to'),
          ),
          single(
            i18n('Block Height'),
            String(chain.blocks),
            i18n('The highest block Zebra has verified'),
          ),
          single(
            i18n('Estimated Network Height'),
            String(chain.estimatedheight),
            i18n("Zebra's estimate of the current chain tip"),
          ),
          single(i18n('Blocks Behind'), String(blocksBehind(chain))),
          single(i18n('Sync Progress'), `${progress}%`),
          single(i18n('Best Block Hash'), chain.bestblockhash, null, true),
        ],
      },
    }
  },
)
