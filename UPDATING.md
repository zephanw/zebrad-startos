# Updating the upstream version

This package wraps two upstream projects, each pulled as a published image. Both pins live in `startos/manifest/index.ts`; the package version in `startos/versions/current.ts` follows Zebra.

## Determining the upstream versions

- **Zebra** ([ZcashFoundation/zebra](https://github.com/ZcashFoundation/zebra)) — image `zfnd/zebra:<version>` (no leading `v`):

  ```sh
  gh release view -R ZcashFoundation/zebra --json tagName -q .tagName
  ```

- **lightwalletd** ([zcash/lightwalletd](https://github.com/zcash/lightwalletd)) — image `electriccoinco/lightwalletd:<tag>` (keeps the leading `v`):

  ```sh
  gh release view -R zcash/lightwalletd --json tagName -q .tagName
  ```

Confirm the tag exists for `amd64` before bumping: `docker manifest inspect <image>:<tag>`.

## Applying the bump

1. Update `images.zebra.source.dockerTag` and/or `images.lightwalletd.source.dockerTag` in `startos/manifest/index.ts`.
2. For a Zebra bump, set `version` in `startos/versions/current.ts` to `<zebra version>:0` and write release notes; for a lightwalletd-only bump, increment the revision after the colon.
3. Check the Zebra release notes for config changes. `zebrad.toml` is parsed with `deny_unknown_fields`, so a renamed or removed key that `startos/fileModels/zebrad.toml.ts` writes will stop zebrad from starting. Also re-check `defaultMainnetPeers` in `startos/utils.ts` against `zebra-network/src/config.rs`.
4. Check the lightwalletd release notes for renamed flags used in `startos/main.ts`.
