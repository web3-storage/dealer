import * as Signer from '@ucanto/principal/ed25519'
import * as DID from '@ipld/dag-ucan/did'
import { CAR, HTTP } from '@ucanto/transport'
import { connect } from '@ucanto/client'
import { Dealer } from '@web3-storage/filecoin-client'
import { randomAggregate } from '@web3-storage/filecoin-api/test'

// UCAN actors
const storefront = await Signer.generate()
const dealerService = DID.parse('did:web:staging.dealer.web3.storage')

const connection = connect({
  id: dealerService,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: new URL('https://vcs.dealer.web3.storage/'),
    // url: new URL('https://pr15.dealer.web3.storage/'),
    method: 'POST',
  }),
})

// Aggregate
const { pieces, aggregate } = await randomAggregate(100, 128)
const offer = pieces.map((p) => p.link)

// invoke piece add from storefront
const res = await Dealer.dealQueue(
  {
    issuer: storefront,
    with: storefront.did(),
    audience: dealerService,
  },
  aggregate.link.link(),
  offer,
  storefront.did(),
  'label',
  { connection }
)

console.log('res', res.out)
