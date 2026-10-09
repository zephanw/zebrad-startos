import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/**
 * Package-side state with no home in zebrad.toml: the RPC proxy password,
 * lightwalletd's settings (it takes CLI flags, not a config file), and the
 * one-shot maintenance flags the maintenance actions raise.
 */
const lightwalletdShape = z.looseObject({
  enabled: z.boolean().catch(true),
  donationAddress: z.string().nullable().catch(null),
  logLevel: z.number().int().min(1).max(7).catch(4),
})

export const shape = z.looseObject({
  /** Basic-auth password the StartOS proxy enforces on the RPC interface. */
  rpcPassword: z.string().nullable().catch(null),
  lightwalletd: lightwalletdShape.catch(() => lightwalletdShape.parse({})),
  /** Delete zebrad's chain state before its next start. */
  resyncZebra: z.boolean().catch(false),
  /** Start lightwalletd with --redownload once. */
  redownloadLightwalletd: z.boolean().catch(false),
})

export type Store = z.infer<typeof shape>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
