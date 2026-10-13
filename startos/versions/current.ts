import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '6.4.2:3',
  releaseNotes: {
    en_US: 'New icon. No other changes; your synced blockchain is kept.',
    es_ES:
      'Nuevo icono. Sin otros cambios; tu blockchain sincronizada se conserva.',
    de_DE:
      'Neues Symbol. Keine weiteren Änderungen; deine synchronisierte Blockchain bleibt erhalten.',
    pl_PL:
      'Nowa ikona. Bez innych zmian; zsynchronizowany blockchain zostaje zachowany.',
    fr_FR:
      'Nouvelle icône. Aucun autre changement ; votre blockchain synchronisée est conservée.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
