import * as Signer from '@ucanto/principal/ed25519'
import * as DID from '@ipld/dag-ucan/did'
import { CAR, HTTP } from '@ucanto/transport'
import { connect } from '@ucanto/client'

/**
 * 
 * @param {URL} url 
 */
export async function getDealerClientConfig (url) {
  // UCAN actors
  const storefront = await Signer.generate()
  const dealerService = DID.parse('did:web:staging.dealer.web3.storage')

  return {
    invocationConfig: {
      issuer: storefront,
      with: storefront.did(),
      audience: dealerService,
    },
    connection: connect({
      id: dealerService,
      codec: CAR.outbound,
      channel: HTTP.open({
        url,
        method: 'POST',
      }),
    })
  }
}
