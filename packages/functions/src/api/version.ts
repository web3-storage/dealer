import { Config } from 'sst/node/config'
import { getServiceSigner } from '@spade-proxy/core/service'

const repo = 'https://github.com/web3-storage/spade-proxy'

export async function handler() {
  const {
    NAME: name,
    VERSION: version,
    COMMIT: commit,
    STAGE: env,
    SPADE_PROXY_DID
  } = process.env
  const { PRIVATE_KEY } = Config
  const serviceSigner = getServiceSigner({ SPADE_PROXY_DID, PRIVATE_KEY })
  const did = serviceSigner.did()
  const publicKey = serviceSigner.toDIDKey()

  return {
    statusCode: 200,
    headers: {
      'Content-Type': `application/json`,
    },
    body: JSON.stringify({ name, version, did, publicKey, commit, env, repo }),
  };
}

