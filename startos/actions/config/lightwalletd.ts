import { storeJson } from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value } = sdk

// logrus levels lightwalletd accepts on --log-level.
const logLevels = {
  '2': 'Error',
  '3': 'Warning',
  '4': 'Info',
  '5': 'Debug',
} as const

const inputSpec = InputSpec.of({
  enabled: Value.toggle({
    name: i18n('Enable Light Wallet Server'),
    description: i18n(
      'Run lightwalletd so light wallets such as Zashi can sync from your node. Turning it off frees its disk cache and memory, and removes the Light Wallet Server interface.',
    ),
    default: true,
  }),
  donationAddress: Value.text({
    name: i18n('Donation Address'),
    description: i18n(
      'Optional unified address (u1…) that lightwalletd advertises to the wallets that connect, so users can tip you for running the server.',
    ),
    required: false,
    default: null,
    placeholder: 'u1…',
    patterns: [
      {
        regex: '^u1[0-9a-z]+$',
        description: i18n(
          'Must be a Mainnet unified address starting with u1.',
        ),
      },
    ],
  }),
  logLevel: Value.select({
    name: i18n('Log Level'),
    description: i18n('How much lightwalletd writes to the service log.'),
    default: '4',
    values: logLevels,
  }),
})

export const lightwalletdConfig = sdk.Action.withInput(
  'lightwalletd-config',

  async () => ({
    name: i18n('Light Wallet Server Settings'),
    description: i18n(
      'Turn lightwalletd on or off, set a donation address, and choose its log level.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const lwd = await storeJson.read((s) => s.lightwalletd).once()
    const level = String(lwd?.logLevel ?? 4)
    return {
      enabled: lwd?.enabled ?? true,
      donationAddress: lwd?.donationAddress ?? null,
      logLevel: level in logLevels ? (level as keyof typeof logLevels) : '4',
    }
  },

  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      lightwalletd: {
        enabled: input.enabled,
        donationAddress: input.donationAddress,
        logLevel: Number(input.logLevel),
      },
    })
  },
)
