import * as ed25519 from '@ucanto/principal/ed25519'
import * as Server from '@ucanto/server'
import * as DID from '@ipld/dag-ucan/did'
import { Signer } from '@ucanto/interface'
import { CAR } from '@ucanto/transport'

import { createService } from '@web3-storage/filecoin-api/dealer'

import type { HandlerExecutionError } from '@ucanto/interface'
import type { DealerServiceContext } from '@web3-storage/filecoin-api/types'

export const createUcantoServer = (servicePrincipal: Signer, context: DealerServiceContext, errorReporter: ErrorReporter) =>
Server.create({
  id: servicePrincipal,
  codec: CAR.inbound,
  service: createService(context),
  catch: (error) => errorReporter.catch(error),
})

/**
 * Given a config, return a ucanto Signer object representing the service
 */
export function getServiceSigner(config: ServiceSignerCtx) {
  const signer = ed25519.parse(config.privateKey)
  if (config.did) {
    const did = DID.parse(config.did).did()
    return signer.withDID(did)
  }
  return signer
}

export type ServiceSignerCtx = {
  // multiformats private key of primary signing key
  privateKey: string
  // public DID for the upload service (did:key:... derived from PRIVATE_KEY if not set)
  did?: string
}

export interface ErrorReporter {
  catch: (error: HandlerExecutionError) => void
}
