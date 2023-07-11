import * as ed25519 from '@ucanto/principal/ed25519'
import * as DID from '@ipld/dag-ucan/did'
import { Signer } from '@ucanto/interface'

import * as AggregateAPI from '@web3-storage/aggregate-api'

export const createUcantoServer = (servicePrincipal: Signer, context: AggregateAPI.ServiceContext, errorReporter: AggregateAPI.ErrorReporter) =>
AggregateAPI.createServer({
  ...context,
  id: servicePrincipal,
  errorReporter
})

/**
 * Given a config, return a ucanto Signer object representing the service
 */
export function getServiceSigner(config: ServiceSignerCtx) {
  const signer = ed25519.parse(config.PRIVATE_KEY)
  if (config.SPADE_PROXY_DID) {
    const did = DID.parse(config.SPADE_PROXY_DID).did()
    return signer.withDID(did)
  }
  return signer
}

export type ServiceSignerCtx = {
  // multiformats private key of primary signing key
  PRIVATE_KEY: string
  // public DID for the upload service (did:key:... derived from PRIVATE_KEY if not set)
  SPADE_PROXY_DID?: string
}
