import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'zebrad',
  title: 'Zcash',
  license: 'MIT',
  packageRepo: 'https://github.com/zephanw/zebrad-startos',
  upstreamRepo: 'https://github.com/ZcashFoundation/zebra',
  marketingUrl: 'https://zfnd.org/zebra/',
  donationUrl: null,
  description: { short, long },
  // startos: package-side state (store.json), mounted by no subcontainer.
  // zebra: zebrad.toml, the chain state, and the peer cache.
  // lightwalletd: the compact-block cache and the TLS pair lightwalletd serves.
  volumes: ['startos', 'zebra', 'lightwalletd'],
  images: {
    zebra: {
      source: { dockerTag: 'zfnd/zebra:6.4.2' },
      arch: ['x86_64'],
    },
    // electriccoinco/lightwalletd publishes amd64 only.
    lightwalletd: {
      source: { dockerTag: 'electriccoinco/lightwalletd:v0.5.4' },
      arch: ['x86_64'],
    },
  },
})
