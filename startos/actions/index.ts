import { sdk } from '../sdk'
import { lightwalletdConfig } from './config/lightwalletd'
import { miningConfig } from './config/mining'
import { peersConfig } from './config/peers'
import { performanceConfig } from './config/performance'
import { generateRpcPassword } from './generateRpcPassword'
import { rebuildLightwalletd, resyncBlockchain } from './maintenance'
import { nodeInfo } from './nodeInfo'

export const actions = sdk.Actions.of()
  .addAction(nodeInfo)
  .addAction(peersConfig)
  .addAction(performanceConfig)
  .addAction(lightwalletdConfig)
  .addAction(miningConfig)
  .addAction(generateRpcPassword)
  .addAction(rebuildLightwalletd)
  .addAction(resyncBlockchain)
