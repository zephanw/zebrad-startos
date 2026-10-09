import { storeJson } from '../fileModels/store.json'
import { zebradToml } from '../fileModels/zebrad.toml'
import { sdk } from '../sdk'

// Creates both files on install and repairs them on every init: the schemas'
// .catch() defaults fill anything missing and reset any enforced literal.
export const seedFiles = sdk.setupOnInit(async (effects) => {
  await storeJson.merge(effects, {})
  await zebradToml.merge(effects, {})
})
