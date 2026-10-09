import { zebradToml } from '../../fileModels/zebrad.toml'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  miner_address: Value.text({
    name: i18n('Miner Address'),
    description: i18n(
      "The Zcash address that block rewards from getblocktemplate are paid to. Needed only if you point mining software or a pool at this node's RPC. A transparent (t1/t3), Sapling (zs) or unified (u1) address.",
    ),
    required: false,
    default: null,
    placeholder: 'u1…',
    patterns: [
      {
        regex: '^(t1|t3|zs1|u1)[0-9a-zA-Z]+$',
        description: i18n(
          'Must be a Mainnet Zcash address starting with t1, t3, zs1 or u1.',
        ),
      },
    ],
  }),
  miner_memo: Value.text({
    name: i18n('Coinbase Memo'),
    description: i18n(
      'Optional memo attached to the shielded coinbase output of blocks you mine. Only used with a Sapling or unified miner address.',
    ),
    required: false,
    default: null,
    maxLength: 512,
  }),
})

export const miningConfig = sdk.Action.withInput(
  'mining-config',

  async () => ({
    name: i18n('Mining Settings'),
    description: i18n(
      'Set the payout address Zebra uses when mining software requests block templates over RPC.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const mining = await zebradToml.read((c) => c.mining).once()
    return {
      miner_address: mining?.miner_address ?? null,
      miner_memo: mining?.miner_memo ?? null,
    }
  },

  async ({ effects, input }) => {
    await zebradToml.merge(effects, {
      mining: {
        miner_address: input.miner_address ?? undefined,
        miner_memo: input.miner_memo ?? undefined,
      },
    })
  },
)
