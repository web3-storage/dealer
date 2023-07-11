import {
  S3Client,
  ServiceInputTypes,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import pRetry from 'p-retry'

import * as AggregateAPI from '@web3-storage/aggregate-api'
import { ArrangedOfferStore } from '../tables/arranged-offer-store'

export function createOfferStore(region: string, bucketName: string, arrangedOfferStore: ArrangedOfferStore, options?: ServiceInputTypes) {
  const s3 = new S3Client({
    region,
    ...(options || {}),
  })
  return useOfferStore(s3, bucketName, arrangedOfferStore)
}

/**
 * Offer Store bucket will persist offers keyed as `YYYY-MM-DD HH:MM:00 `${commitmentProof}``.
 * The time format follows same pattern as used by AWS Athena + AWS S3
 */

export function useOfferStore(s3client: S3Client, bucketName: string, arrangedOfferStore: ArrangedOfferStore) {
  return {
    queue: async (aggregateOffer: AggregateAPI.OfferToQueue) => {
      const { commitmentProof, offers } = aggregateOffer
      const putCmd = new PutObjectCommand({
        Bucket: bucketName,
        ContentType: 'application/json',
        Key: `${getNextUtcDateName()} ${commitmentProof.toString()}`,
        Body: JSON.stringify({
          commitmentProof: commitmentProof.toString(),
          offers
        })
      })

      await pRetry(() => s3client.send(putCmd))

      // add commitmentProof for polling
      // once an aggregate is fulfilled (accepted or rejected) a receipt will be generated.
      await arrangedOfferStore.set(commitmentProof, 'queued')
    }
  } as AggregateAPI.OfferStore
}

/**
 * Get next date string in format `YYYY-MM-DD HH:MM:00` with next multiple of 15 minutes.
 */
export function getNextUtcDateName() {
  const cDate = new Date()

  // normalize date to multiple of 15 minutes
  const currentMinute = cDate.getUTCMinutes()
  const factor = Math.floor(currentMinute / 15) + 1
  const additionalTime = ((factor * 15) - currentMinute) * 60000

  const nDate = new Date(cDate.getTime() + additionalTime)
  
  return `${nDate.getUTCFullYear()}-${nDate.getUTCMonth()}-${nDate.getUTCDay()} ${nDate.getUTCHours()}:${nDate.getUTCMinutes()}:00`
}
