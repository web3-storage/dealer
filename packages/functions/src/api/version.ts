import { Config } from 'sst/node/config'
import { getServiceSigner } from '@dealer/core/src/service'

import { mustGetEnv } from '../utils'

const repo = 'https://github.com/web3-storage/dealer'

export async function handler() {
  const {
    did,
    name,
    version,
    commit,
    env
  } = getLambdaEnv()
  const { PRIVATE_KEY: privateKey } = Config
  const serviceSigner = getServiceSigner({ did, privateKey })
  const serviceDid = serviceSigner.did()
  const publicKey = serviceSigner.toDIDKey()

  return {
    statusCode: 200,
    headers: {
      'Content-Type': `application/json`,
    },
    body: JSON.stringify({ name, version, did: serviceDid, publicKey, commit, env, repo }),
  };
}

function getLambdaEnv () {
  return {
    did: mustGetEnv('DID'),
    name: mustGetEnv('NAME'),
    version: mustGetEnv('VERSION'),
    commit: mustGetEnv('COMMIT'),
    env: mustGetEnv('STAGE')
  }
}
