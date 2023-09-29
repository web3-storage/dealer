import * as ed25519 from '@ucanto/principal/ed25519'
import * as Server from '@ucanto/server'
import * as DID from '@ipld/dag-ucan/did'
import { Signer } from '@ucanto/interface'
import { CAR, HTTP } from '@ucanto/transport'
import { connect } from '@ucanto/client'

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

/**
 * 
 * @param {{ did: string, url: string }} config 
 * @returns 
 */
export function getServiceConnection (config: ServiceConnectionCtx) {
  const servicePrincipal = DID.parse(config.did) // 'did:web:tracker.web3.storage'
  const serviceURL = new URL(config.url) // 'https://tracker.web3.storage'

  const serviceConnection = connect({
    id: servicePrincipal,
    codec: CAR.outbound,
    channel: HTTP.open({
      url: serviceURL,
      method: 'POST',
    }) as ed25519.Channel<Record<string, any>>,
  })

  return serviceConnection
}

export type ServiceConnectionCtx = {
  // url of deployed service
  url: string
  // public DID for the service (did:key:... derived from PRIVATE_KEY if not set)
  did: string
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
