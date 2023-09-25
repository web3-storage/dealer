import { Store } from '@web3-storage/filecoin-api/types'
import { Deal } from '../data/deal.js'
import { decode as offerDecode } from '../data/offer.js'

export async function dealerStore ({
  offerRecord,
  dealStore
}: DealerStoreContext) {
  const deal = offerDecode.message(offerRecord)

  return await dealStore.put(deal)
}

export interface DealerStoreContext {
  offerRecord: string
  dealStore: Store<Deal>
}
