import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '6.4.2:2',
  releaseNotes: {
    en_US:
      'Light wallet server now works with Zodl: StartOS handles TLS for gRPC directly, and a plaintext grpc:// address is added for Android wallets on your home network and for .onion (Tor) access. Your synced blockchain is kept.',
    es_ES:
      'El servidor de billeteras ligeras ahora funciona con Zodl: StartOS gestiona directamente el TLS para gRPC y se añade una dirección grpc:// sin cifrar para billeteras Android en tu red doméstica y para acceso por .onion (Tor). Tu blockchain sincronizada se conserva.',
    de_DE:
      'Der Light-Wallet-Server funktioniert jetzt mit Zodl: StartOS übernimmt TLS für gRPC direkt, und eine unverschlüsselte grpc://-Adresse kommt für Android-Wallets im Heimnetz und für .onion-Zugriff (Tor) hinzu. Deine synchronisierte Blockchain bleibt erhalten.',
    pl_PL:
      'Serwer lekkich portfeli działa teraz z Zodl: StartOS obsługuje TLS dla gRPC bezpośrednio, a dla portfeli Android w sieci domowej i dostępu przez .onion (Tor) dodano nieszyfrowany adres grpc://. Zsynchronizowany blockchain zostaje zachowany.',
    fr_FR:
      "Le serveur de portefeuilles légers fonctionne désormais avec Zodl : StartOS gère directement le TLS pour gRPC, et une adresse grpc:// en clair est ajoutée pour les portefeuilles Android sur votre réseau domestique et pour l'accès .onion (Tor). Votre blockchain synchronisée est conservée.",
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
