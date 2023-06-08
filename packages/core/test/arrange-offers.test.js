import { test } from './helpers/context.js'
import {
  createS3,
  createBucket,
  createDynamodDb,
  createTable,
} from './helpers/resources.js'
import { CID } from 'multiformats/cid'
import { generateOffers, createAggregateStore } from './helpers/offers.js'

import { arrangedOfferTableProps } from '../tables/index.js'
import { mutateOffersToArrange } from '../arrange-offers.js'
import { useOfferStore } from '../buckets/offer-store.js'
import { useArrangedOfferStore } from '../tables/arranged-offer-store.js'

test.before(async (t) => {
  Object.assign(t.context, {
    dynamo: await createDynamodDb(),
    s3: (await createS3()).client,
  })
})

test('can arrange multiple offers', async t => {
  const { dynamo, s3 } = t.context
  const bucketName = await createBucket(s3)

  const aggregateStore = createAggregateStore()
  const arrangedOfferStore = useArrangedOfferStore(
    dynamo,
    await createTable(dynamo, arrangedOfferTableProps)
  )
  const offerStore = useOfferStore(s3, bucketName, arrangedOfferStore)
  const offers = (await generateOffers(10, 10))

  const dateToFront = new Date()
  dateToFront.setMinutes(dateToFront.getMinutes() + 15)
  const dataSegments = [
    'baga6ea4seaqcq4xx7rqx2lsrm6iky7qqk5jh7pbaj5bgdu22afhp4fodvccb6bq',
    'baga6ea4seaqhisghxrl4yntcsxtoc6rany2fjtbxgcnhhztkh5myy2mbs4nk2ki'
  ].map(s => CID.parse(s))
  await Promise.all(
    dataSegments.map(commitmentProof => offerStore.queue({ commitmentProof, offers }))
  )

  // @ts-expect-error set one segment aggregate
  aggregateStore.set(dataSegments[0])
  const resWithFirstSegment = await mutateOffersToArrange(arrangedOfferStore, aggregateStore)
  t.is(resWithFirstSegment.length, 1)
  t.is(resWithFirstSegment[0].commitmentProof.toString(), dataSegments[0].toString())

  const resWithoutReadySegments = await mutateOffersToArrange(arrangedOfferStore, aggregateStore)
  t.is(resWithoutReadySegments.length, 0)

  // @ts-expect-error set second segment aggregate
  aggregateStore.set(dataSegments[1])
  const resWithSecondSegment = await mutateOffersToArrange(arrangedOfferStore, aggregateStore)
  t.is(resWithSecondSegment.length, 1)
  t.is(resWithSecondSegment[0].commitmentProof.toString(), dataSegments[1].toString())
})
