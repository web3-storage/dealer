import { test } from './helpers/context.js'
import {
  createS3,
  createBucket,
  createDynamodDb,
  createTable,
} from './helpers/resources.js'
import { generateOffers, createAggregateStore } from './helpers/offers.js'
import { mockService } from './helpers/mocks.js'

import { CID } from 'multiformats/cid'
import * as Client from '@ucanto/client'
import { ed25519 } from '@ucanto/principal'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as OfferCapabilities from '@web3-storage/capabilities/offer'

import { arrangedOfferTableProps } from '../tables/index.js'
import { mutateOffersToArrange, offerArrange } from '../arrange-offers.js'
import { useOfferStore } from '../buckets/offer-store.js'
import { useArrangedOfferStore } from '../tables/arranged-offer-store.js'

test.before(async (t) => {
  Object.assign(t.context, {
    dynamo: await createDynamodDb(),
    s3: (await createS3()).client,
  })
})

test('can mutate multiple offers to be arranged according to their state', async t => {
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

test('can invoke arranged offer', async t => {
  t.plan(2)

  const signer = await ed25519.generate()
  const offers = [
    {
      commitmentProof: CID.parse('baga6ea4seaqcq4xx7rqx2lsrm6iky7qqk5jh7pbaj5bgdu22afhp4fodvccb6bq'),
      stat: /** @type {import('../tables/arranged-offer-store.js').STAT} */ ('accepted')
    },
    {
      commitmentProof: CID.parse('baga6ea4seaqcq4xx7rqx2lsrm6iky7qqk5jh7pbaj5bgdu22afhp4fodvccb6cq'),
      stat: /** @type {import('../tables/arranged-offer-store.js').STAT} */ ('rejected')
    }
  ]

  // Create Ucanto service
  const service = mockService({
    offer: {
      arrange: Server.provide(OfferCapabilities.arrange, async ({ capability }) => {
        const commitmentProof = capability.nb.commitmentProof
        const offer = offers.find(o => o.commitmentProof.toString() === commitmentProof.toString())
        const status = offer?.stat

        t.assert(status)
        if (!status) {
          throw new Error('status not found')
        }

        return {
          ok: {
            status,
          },
        }
      })
    }
  })

  for (const offer of offers) {
    await offerArrange(offer, signer, getConnection(service, signer).connection)
  }
})

test('fails to create agent message with receipt for non arranged offer', async t => {
  const signer = await ed25519.generate()
  const commitmentProof = CID.parse('baga6ea4seaqcq4xx7rqx2lsrm6iky7qqk5jh7pbaj5bgdu22afhp4fodvccb6bq')

  /** @type {import('../tables/arranged-offer-store.js').STAT} */
  const stat = 'queued'

  const offer = {
    commitmentProof,
    stat
  }

  await t.throwsAsync(() => offerArrange(offer, signer))
})

/**
 * @param {Partial<{
 * aggregate: Partial<import('@web3-storage/aggregate-client/types').Service['aggregate']>
 * offer: Partial<import('@web3-storage/aggregate-client/types').Service['offer']>
 * }>} service
 */
function getConnection(service, serviceProvider) {
  const server = Server.create({
    id: serviceProvider,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: serviceProvider,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}
