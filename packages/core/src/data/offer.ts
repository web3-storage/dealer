import * as JSON from '@ipld/dag-json'
import { fromString } from 'uint8arrays/from-string'
import { toString } from 'uint8arrays/to-string'
import { parseLink } from '@ucanto/server'

import { DealerMessageRecord } from '@web3-storage/filecoin-api/types'
import { Deal } from './deal'

// key in format of `YYYY-MM-DDTHH:MM:SS `${commitmentProof}``
function createKey (deal: DealerMessageRecord) {
  return `${(new Date(deal.insertedAt)).toISOString()} ${deal.aggregate.toString()}.json`
}

export const encode = {
  /**
   * Encode offer data structure from deal to store record.
   */
  record: function (dealRecord: DealerMessageRecord): string {
    // stored value
    const value = {
      aggregate: dealRecord.aggregate.toString(),
      pieces: dealRecord.pieces.map(p => p.toString()),
      collection: dealRecord.storefront,
      orderID: dealRecord.insertedAt || Date.now()
    } satisfies Offer

    return JSON.stringify(value)
  },
  key: createKey,
  /**
   * Encode offer from deal data structure to queue message.
   */
  message: function (dealRecord: DealerMessageRecord, key: string): string {
    const deal = {
      aggregate: dealRecord.aggregate,
      stat: 0,
      storefront: dealRecord.storefront,
      offer: key,
      insertedAt: dealRecord.insertedAt
    } satisfies Deal

    const encodedBytes = JSON.encode(deal)
    return toString(encodedBytes)
  }
}

export const decode = {
  /**
   * Decode offer data structure from stored record.
   */
  record: function (storeRecord: EncodedRecord): DealerMessageRecord {
    const record = JSON.parse(storeRecord.value) as Offer
    return {
      aggregate: parseLink(record.aggregate),
      pieces: record.pieces.map(p => parseLink(p)),
      storefront: record.collection,
      insertedAt: record.orderID
    }
  },
  /**
   * Decode offer data structure from queue message.
   */
  message: function (messageBody: string): Deal {
    const decodedBytes = fromString(messageBody)
    return JSON.decode(decodedBytes)
  }
}

export type EncodedRecord = {
  key: string
  value: string
}

export type Offer = {
  aggregate: string
  pieces: string[]
  collection: string
  orderID: number
}
