import { ConnectionView } from '@ucanto/principal/ed25519'
import { Store } from '@web3-storage/filecoin-api/types'
import { InvocationConfig } from '@web3-storage/filecoin-client/types'
import { Dealer } from '@web3-storage/filecoin-client'

import { Deal, Status } from '../data/deal.js'
import { DealerMessageRecord } from '@web3-storage/filecoin-api/types'
import { UnexpectedDealForApprovalFailed } from '../errors.js'

/**
 * Invokes `aggregate/accept` capability to self sign receipt.
 * Get `pieces` in the aggregate and invoke `aggregate/accept`.
 */
export async function aggregateAccept ({
  deal,
  dealerServiceConnection,
  dealerInvocationConfig,
  offerStore
}: AggregateAcceptContext) {
  // Deal should only get to here if it was approved
  if (deal.stat !== Status.Approved) {
    return {
      error: new UnexpectedDealForApprovalFailed(
        `aggregate ${deal.aggregate.link.toString()} has state ${deal.stat}`
      )
    }
  }

  // Get pieces included in this aggregate
  const offer = await offerStore.get(deal)
  if (offer.error) {
    return {
      error: offer.error
    }
  }

  // Invoke `aggregate/accept` capability to issue self signed receipt
  const dealAddResponse = await Dealer.dealAdd(
    dealerInvocationConfig,
    deal.aggregate,
    offer.ok.pieces,
    dealerInvocationConfig.issuer.did(),
    'random-label-to-deprecate',
    { connection: dealerServiceConnection }
  )

  if (dealAddResponse.out.error) {
    return {
      error: dealAddResponse.out.error
    }
  }

  // TODO: Add to deal queue trigger
  // is this `filecoinDealQueue`?

  return {
    ok: {},
    error: undefined,
  }
}

export interface AggregateAcceptContext {
  deal: Deal
  dealerServiceConnection: ConnectionView<any>
  dealerInvocationConfig: InvocationConfig
  offerStore: Store<DealerMessageRecord>
}
