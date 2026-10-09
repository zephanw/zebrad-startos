import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { rpcUsername } from '../utils'

/**
 * The one owner of the RPC credential: generates it, stores it, returns it,
 * and rotates it on a re-run. interfaces.ts reads the stored password, so
 * the RPC interface appears (behind the proxy's basic auth) the first time
 * this runs and picks up the new password on every rotation.
 */
export const generateRpcPassword = sdk.Action.withoutInput(
  'generate-rpc-password',

  async ({ effects }) => ({
    name: i18n('Generate RPC Password'),
    description: i18n(
      "Create the username and password that external apps use to reach Zebra's JSON-RPC interface. Running it again replaces the password.",
    ),
    warning: (await storeJson.read((s) => s.rpcPassword).const(effects))
      ? i18n(
          'Replaces the current RPC password. Apps using the old one will be refused until you update them.',
        )
      : null,
    allowedStatuses: 'any',
    group: i18n('RPC'),
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const password = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })
    await storeJson.merge(effects, { rpcPassword: password })

    return {
      version: '1',
      title: i18n('RPC Credentials'),
      message: i18n(
        'Use these with the RPC interface address shown on the Dashboard. Store the password somewhere safe; running this action again replaces it.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: rpcUsername,
            copyable: true,
            masked: false,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            copyable: true,
            masked: true,
            qr: false,
          },
        ],
      },
    }
  },
)
