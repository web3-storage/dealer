import { test } from './helpers/context.js'

import git from 'git-rev-sync'
import delay from 'delay'
import { toString } from 'uint8arrays/to-string'
import { Dealer } from '@web3-storage/filecoin-client'
import { randomAggregate } from '@web3-storage/filecoin-api/test'

import { getDealerClientConfig } from './helpers/dealer-client.js'
import { pollTableItem } from './helpers/table.js'
import { pollBucketItem } from './helpers/bucket.js'
import {
  getApiEndpoint,
  getStage,
  getDealStoreDynamoDb,
  getOfferStoreBucketInfo
} from './helpers/deployment.js'
import pRetry from 'p-retry'

test.before(t => {
  t.context = {
    apiEndpoint: getApiEndpoint(),
    dealStoreDynamo: getDealStoreDynamoDb(),
    offerStoreBucket: getOfferStoreBucketInfo()
  }
})

test('GET /version', async t => {
  const stage = getStage()
  const response = await fetch(`${t.context.apiEndpoint}/version`)
  t.is(response.status, 200)

  const body = await response.json()
  t.is(body.env, stage)
  t.is(body.commit, git.long('.'))
})

test('POST /', async t => {
  const {
    invocationConfig,
    connection
  } = await getDealerClientConfig(new URL(t.context.apiEndpoint))

  // Create a random aggregate
  const label = 'label'
  const { pieces, aggregate } = await randomAggregate(100, 128)
  const offer = pieces.map((p) => p.link)

  const res = await Dealer.dealQueue(
    invocationConfig,
    aggregate.link.link(),
    offer,
    invocationConfig.with,
    label,
    { connection }
  )

  t.truthy(res.out.ok)
  t.falsy(res.out.error)
  t.truthy(aggregate.link.link().equals(res.out.ok?.aggregate))

  // wait for deal-store entry to exist given it is propagated with a queue message
  await delay(5_000)

  /** @type {import('../packages/core/src/data/deal.js').EncodedDeal | undefined} */
  // @ts-expect-error does not automatically infer
  const dealEntry = await pollTableItem(
    t.context.dealStoreDynamo.client,
    t.context.dealStoreDynamo.tableName,
    { aggregate: res.out.ok?.aggregate?.toString() }
  )
  if (!dealEntry) {
    throw new Error('deal store item was not found')
  }
  t.is(dealEntry.aggregate, aggregate.link.link().toString())
  t.is(dealEntry.storefront, invocationConfig.with)
  t.is(dealEntry.stat, 0)
  t.truthy(dealEntry.insertedAt)
  t.truthy(dealEntry.offer)

  // Verify offer store
  // remove bucket encoding
  const bucketKey = dealEntry.offer.replace('s3://', '').replace(`${t.context.offerStoreBucket.bucket}/`, '')
  console.log('try to get bucket item...', bucketKey)
  const bucketItem = await pollBucketItem(
    t.context.offerStoreBucket.client,
    t.context.offerStoreBucket.bucket,
    bucketKey
  )
  if (!bucketItem) {
    throw new Error('offer store item was not found')
  }
  /** @type {import('../packages/core/src/data/offer.js').Offer} */
  const encodedOffer = JSON.parse(toString(bucketItem))

  t.is(encodedOffer.aggregate, aggregate.link.link().toString())
  t.is(encodedOffer.collection, invocationConfig.with)
  t.truthy(encodedOffer.orderID)
  t.deepEqual(encodedOffer.pieces, offer.map(o => o.toString()))
})
