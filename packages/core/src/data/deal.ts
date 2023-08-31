import { PieceLink } from '@web3-storage/data-segment'
import { parseLink } from '@ucanto/server'

export const encode = {
  /**
   * Encode data structure to store record and propagate pointer to it.
   */
  record: function (record: Deal): Promise<EncodedDeal> {
    return Promise.resolve({
      aggregate: record.aggregate.toString(),
      storefront: record.storefront,
      stat: 0,
      offer: record.offer,
      insertedAt: record.insertedAt
    } satisfies EncodedDeal)
  },
  key: function (record: Deal): EncodedKey {
    return {
      aggregate: record.aggregate.toString(),
    }
  }
}

export const decode = {
  /**
   * Decode deal data structure from stored record.
   */
  record: function (storeRecord: EncodedDeal): Promise<Deal> {
    return Promise.resolve({
      ...storeRecord,
      aggregate: parseLink(storeRecord.aggregate),
    })
  }
}

export type Deal = {
  aggregate: PieceLink
  storefront: string
  offer: string
  stat: number
  insertedAt: number
}

export type EncodedDeal = {
  aggregate: string
  storefront: string
  offer: string
  stat: number
  insertedAt: number
}

export type EncodedKey = {
  aggregate: string
}
