import { zebradToml } from '../../fileModels/zebrad.toml'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'
import { defaultMainnetPeers } from '../../utils'

const { InputSpec, Value, List } = sdk

const inputSpec = InputSpec.of({
  peerset_initial_target_size: Value.number({
    name: i18n('Target Peer Count'),
    description: i18n(
      'How many outbound peers Zebra tries to keep connected. Zebra may connect to more peers than this while it syncs. Lower it on a slow or metered connection.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    max: 500,
    footnote: `${i18n('Default')}: 25`,
  }),
  max_connections_per_ip: Value.number({
    name: i18n('Max Connections per IP'),
    description: i18n(
      'How many connections Zebra accepts from a single IP address. Raise it if several of your own nodes sit behind one public IP.',
    ),
    required: false,
    default: null,
    integer: true,
    min: 1,
    max: 100,
    footnote: `${i18n('Default')}: 1`,
  }),
  additional_peers: Value.list(
    List.text(
      {
        name: i18n('Additional Peers'),
        description: i18n(
          "Extra nodes or DNS seeders for Zebra to connect to, as host:port (for example mynode.example.com:8233). They are added to Zebra's built-in seeders, never instead of them.",
        ),
        default: [],
      },
      {
        placeholder: 'mynode.example.com:8233',
        patterns: [
          {
            regex: '^(\\[[0-9a-fA-F:]+\\]|[A-Za-z0-9.-]+):[0-9]{1,5}$',
            description: i18n(
              'Must be a hostname, IPv4 address or [IPv6] address followed by :port, with no scheme.',
            ),
          },
        ],
      },
    ),
  ),
})

export const peersConfig = sdk.Action.withInput(
  'peers-config',

  async () => ({
    name: i18n('Peer Settings'),
    description: i18n(
      'Set how many peers Zebra connects to and add your own peers or seeders.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const network = await zebradToml.read((c) => c.network).once()
    return {
      peerset_initial_target_size: network?.peerset_initial_target_size ?? null,
      max_connections_per_ip: network?.max_connections_per_ip ?? null,
      additional_peers: (network?.initial_mainnet_peers ?? []).filter(
        (p) => !defaultMainnetPeers.includes(p),
      ),
    }
  },

  async ({ effects, input }) => {
    const additional = [...new Set(input.additional_peers)].filter(
      (p) => !defaultMainnetPeers.includes(p),
    )
    await zebradToml.merge(effects, {
      network: {
        peerset_initial_target_size:
          input.peerset_initial_target_size ?? undefined,
        max_connections_per_ip: input.max_connections_per_ip ?? undefined,
        // Setting the list replaces Zebra's defaults, so the seeders stay in.
        initial_mainnet_peers: additional.length
          ? [...defaultMainnetPeers, ...additional]
          : undefined,
      },
    })
  },
)
