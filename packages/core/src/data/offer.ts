import { encode as JSONencode, decode as JSONdecode } from '@ipld/dag-json'
import { fromString } from 'uint8arrays/from-string'
import { toString } from 'uint8arrays/to-string'
import { parseLink } from '@ucanto/server'

import { DealerMessageRecord } from '@web3-storage/filecoin-api/types'
import { Deal } from './deal'

// key in format of `YYYY-MM-DDTHH:MM:SS `${commitmentProof}``
function createKey (deal: DealerMessageRecord) {
  return `${(new Date()).toISOString()} ${deal.aggregate.toString()}.json`
}

export const encode = {
  /**
   * Encode offer data structure from deal to store record.
   */
  record: function (dealRecord: DealerMessageRecord): Promise<string> {
    // stored value
    const value = {
      aggregate: dealRecord.aggregate.toString(),
      pieces: dealRecord.pieces.map(p => p.toString()),
      tenantId: dealRecord.storefront,
      label: dealRecord.label,
      orderId: dealRecord.insertedAt || Date.now()
    } satisfies Offer

    return Promise.resolve(JSON.stringify(value))
  },
  key: createKey,
  /**
   * Encode offer from deal data structure to queue message.
   */
  message: function (dealRecord: DealerMessageRecord, key: string): Promise<string> {
    const deal = {
      aggregate: dealRecord.aggregate,
      stat: 0,
      storefront: dealRecord.storefront,
      offer: key,
      insertedAt: dealRecord.insertedAt
    } satisfies Deal

    const encodedBytes = JSONencode(deal)
    return Promise.resolve(toString(encodedBytes))
  }
}

export const decode = {
  /**
   * Decode offer data structure from stored record.
   */
  record: function (storeRecord: EncodedRecord): Promise<DealerMessageRecord> {
    const record = JSON.parse(storeRecord.value) as Offer
    return Promise.resolve({
      aggregate: parseLink(record.aggregate),
      pieces: record.pieces.map(p => parseLink(p)),
      storefront: record.tenantId,
      label: record.label,
      insertedAt: record.orderId
    })
  },
  /**
   * Decode offer data structure from queue message.
   */
  message: function (messageBody: string): Promise<Deal> {
    const decodedBytes = fromString(messageBody)
    return Promise.resolve(JSONdecode(decodedBytes))
  }
}

export type EncodedRecord = {
  key: string
  value: string
}

export type Offer = {
  aggregate: string
  pieces: string[]
  tenantId: string
  label?: string
  orderId: number
}
