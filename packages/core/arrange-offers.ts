import all from 'it-all'
import * as AggregateAPI from '@web3-storage/aggregate-api'
import * as Offer from '@web3-storage/capabilities/offer'
import { Signer } from '@ucanto/interface'
import { ConnectionView } from '@ucanto/interface'

import { ArrangedOfferStore, ArrangedOffer } from './tables/arranged-offer-store'

const STAT_TO_ARRANGE = 'queued'

export async function mutateOffersToArrange (arrangedOfferStore: ArrangedOfferStore, aggregateStore: AggregateAPI.AggregateStore) {
  const offersQueued = await all(arrangedOfferStore.list(STAT_TO_ARRANGE))

  const offersToArrange = (await Promise.all(
    offersQueued.map(async (commitmentProof) => {
      const aggregate = await aggregateStore.get(commitmentProof)
      if (!aggregate) {
        return {
          commitmentProof,
          stat: STAT_TO_ARRANGE
        }
      } else {
        // TODO: state
        return {
          commitmentProof,
          stat: 'accepted'
        }
      }
    })
  )).filter(offer => offer.stat !== STAT_TO_ARRANGE) as ArrangedOffer[]

  await arrangedOfferStore.batchSet(offersToArrange)
  return offersToArrange
}

export async function offerArrange(offer: ArrangedOffer, serviceSigner: Signer, conn: ConnectionView<any>) {
  const { stat: status, commitmentProof } = offer
  
  if (status !== 'accepted' && status !== 'rejected') {
    // TODO: should this be a receipt of invocation with error?
    throw new Error(`offer arrange for ${commitmentProof} cannot be fulfilled with given status: ${status}`)
  }

  const invocation = Offer.arrange
    .invoke({
      issuer: serviceSigner,
      audience: serviceSigner,
      with: serviceSigner.did(),
      nb: {
        commitmentProof,
      },
    })

  await invocation.execute(conn)
}