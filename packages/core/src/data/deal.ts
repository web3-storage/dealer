import { PieceLink } from '@web3-storage/data-segment'
import { parseLink } from '@ucanto/server'

export const encode = {
  /**
   * Encode data structure to store record and propagate pointer to it.
   */
  record: function (record: Deal): EncodedDeal {
    return {
      aggregate: record.aggregate.toString(),
      storefront: record.storefront,
      stat: Status.Offered,
      offer: record.offer,
      insertedAt: record.insertedAt
    } satisfies EncodedDeal
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
  record: function (storeRecord: EncodedDeal): Deal {
    return {
      ...storeRecord,
      aggregate: parseLink(storeRecord.aggregate),
    }
  }
}

export enum Status {
  Offered = 0,
  Approved = 1,
  Rejected = 2
}
export type UnixTime = number

export type Deal = {
  aggregate: PieceLink
  storefront: string
  offer: string
  stat: Status
  insertedAt: UnixTime
}

export type EncodedDeal = {
  aggregate: string
  storefront: string
  offer: string
  stat: Status
  insertedAt: UnixTime
}

export type EncodedKey = {
  aggregate: string
}
