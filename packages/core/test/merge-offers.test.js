import {
  GetObjectCommand,
} from '@aws-sdk/client-s3'

import { test } from './helpers/context.js'
import {
  createS3,
  createBucket,
  createDynamodDb,
  createTable,
} from './helpers/resources.js'
import { generateOffers } from './helpers/offers.js'

import { arrangedOfferTableProps } from '../tables/index.js'
import { mergeOffers } from '../merge-offers.js'
import { useOfferStore } from '../buckets/offer-store.js'
import { useArrangedOfferStore } from '../tables/arranged-offer-store.js'

test.before(async (t) => {
  Object.assign(t.context, {
    dynamo: await createDynamodDb(),
    s3: (await createS3()).client,
  })
})

test('can merge offers', async t => {
  const { dynamo, s3 } = t.context
  const bucketName = await createBucket(s3)

  const arrangedOfferStore = useArrangedOfferStore(
    dynamo,
    await createTable(dynamo, arrangedOfferTableProps)
  )
  const offerStore = useOfferStore(s3, bucketName, arrangedOfferStore)

  const offers = (await generateOffers(10, 10))

  const dateToFront = new Date()
  dateToFront.setMinutes(dateToFront.getMinutes() + 15)
  const dataSegments = [
    'commP0',
    'commP1'
  ]
  await Promise.all(
    dataSegments.map(commitmentProof => offerStore.queue({ commitmentProof, offers }))
  )

  const mergedOfferId = await mergeOffers(dateToFront, offerStore)
  t.truthy(mergedOfferId)

  const mergedOffersGetCmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: mergedOfferId
  })
  const mergedOffersResponse = await s3.send(mergedOffersGetCmd)
  const rawMergedOffers = await mergedOffersResponse.Body?.transformToString()
  if (!rawMergedOffers) {
    throw new Error('merged offer not written')
  }
  const mergedOffers = JSON.parse(rawMergedOffers)
  t.is(mergedOffers.length, dataSegments.length)
  for (const segment of dataSegments) {
    t.truthy(mergedOffers.find(o => o.commitmentProof === segment))
  }
})
