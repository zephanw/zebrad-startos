import { zebradToml } from '../../fileModels/zebrad.toml'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value } = sdk

const logLevels = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
} as const

const inputSpec = InputSpec.of({
  parallel_cpu_threads: Value.number({
    name: i18n('Verification CPU Threads'),
    description: i18n(
      'How many CPU threads Zebra uses to verify blocks. Leave empty to use every core; set a lower number to leave CPU for other services on your server.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    max: 256,
    footnote: `${i18n('Default')}: ${i18n('all CPU cores')}`,
  }),
  download_concurrency_limit: Value.number({
    name: i18n('Block Download Concurrency'),
    description: i18n(
      'How many blocks Zebra downloads at once during sync. Lower it if sync saturates your connection or memory.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    max: 1000,
    footnote: `${i18n('Default')}: 50`,
  }),
  checkpoint_verify_concurrency_limit: Value.number({
    name: i18n('Checkpoint Verify Concurrency'),
    description: i18n(
      'How many blocks Zebra verifies at once below the last checkpoint. Lower it to reduce memory use during initial sync.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    max: 10000,
    footnote: `${i18n('Default')}: 1000`,
  }),
  full_verify_concurrency_limit: Value.number({
    name: i18n('Full Verify Concurrency'),
    description: i18n(
      'How many blocks Zebra fully verifies at once above the last checkpoint.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    max: 1000,
    footnote: `${i18n('Default')}: 20`,
  }),
  tx_cost_limit: Value.number({
    name: i18n('Mempool Size Limit'),
    description: i18n(
      "Upper bound on the total cost of transactions kept in Zebra's mempool (ZIP-401 cost units, roughly bytes). Lower it if your server is short on RAM.",
    ),
    required: false,
    default: null,
    integer: true,
    min: 1000000,
    max: 1000000000,
    footnote: `${i18n('Default')}: 80000000`,
  }),
  log_level: Value.select({
    name: i18n('Log Level'),
    description: i18n(
      'How much Zebra writes to the service log. Debug is very verbose; use it only while troubleshooting.',
    ),
    default: 'info',
    values: logLevels,
  }),
})

export const performanceConfig = sdk.Action.withInput(
  'performance-config',

  async () => ({
    name: i18n('Sync & Performance'),
    description: i18n(
      "Tune Zebra's CPU, download and verification concurrency, mempool size and log level.",
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const conf = await zebradToml.read().once()
    const filter = conf?.tracing.filter
    return {
      parallel_cpu_threads: conf?.sync.parallel_cpu_threads || null,
      download_concurrency_limit: conf?.sync.download_concurrency_limit ?? null,
      checkpoint_verify_concurrency_limit:
        conf?.sync.checkpoint_verify_concurrency_limit ?? null,
      full_verify_concurrency_limit:
        conf?.sync.full_verify_concurrency_limit ?? null,
      tx_cost_limit: conf?.mempool.tx_cost_limit ?? null,
      log_level:
        filter && filter in logLevels
          ? (filter as keyof typeof logLevels)
          : 'info',
    }
  },

  async ({ effects, input }) => {
    await zebradToml.merge(effects, {
      sync: {
        parallel_cpu_threads: input.parallel_cpu_threads ?? undefined,
        download_concurrency_limit:
          input.download_concurrency_limit ?? undefined,
        checkpoint_verify_concurrency_limit:
          input.checkpoint_verify_concurrency_limit ?? undefined,
        full_verify_concurrency_limit:
          input.full_verify_concurrency_limit ?? undefined,
      },
      mempool: { tx_cost_limit: input.tx_cost_limit ?? undefined },
      // Zebra logs at info with no filter, so info is stored as "unset".
      tracing: {
        filter: input.log_level === 'info' ? undefined : input.log_level,
      },
    })
  },
)
