import all from 'it-all'
import * as AggregateAPI from '@web3-storage/aggregate-api'

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

// TODO: arrange offers
