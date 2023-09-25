import pDefer from 'p-defer'

import { aggregateAccept } from '../../src/workflow/aggregate-accept.js'
import { createBucketStoreClient } from '../../src/store/bucket-client.js'
import { encode as offerEncode, decode as offerDecode } from '../../src/data/offer.js'
import { Status } from '../../src/data/deal.js'
import { getServiceSigner } from '../../src/service.js'
import { UnexpectedDealForApprovalErrorName } from '../../src/errors.js'

import { testWorkflow as test } from '../helpers/context.js'
import { createS3, createBucket } from '../helpers/resources.js'
import { getDealerServiceServer, getDealerCtx } from '../helpers/ucanto.js'
import { OperationErrorName } from '../helpers/errors.js'
import { randomAggregate } from '@web3-storage/filecoin-api/test'

test.beforeEach(async (t) => {
  Object.assign(t.context, {
    s3: (await createS3()).client,
  })
})

test('can invoke aggregate accept to issue receipt', async t => {
  const { s3 } = t.context
  const offerBucketName = await createBucket(s3)
  const dealAdd = pDefer()

  // context
  const offerStore = createBucketStoreClient(s3, {
    name: offerBucketName,
    encodeRecord: offerEncode.record,
    encodeKey,
    decodeRecord: offerDecode.record,
  })
  const { invocationConfig, dealerService } = await getService({
    onCall: dealAdd
  })

  // Create offer
  const { pieces, aggregate } = await randomAggregate(100, 128)
  const storefront = 'did:web:web3.storage'
  const insertedAt = Date.now()
  const offer = {
    aggregate: aggregate.link,
    pieces: pieces.map(p => p.link),
    storefront,
    insertedAt
  }

  // Store Offer
  const { ok: offerStorePutOk } = await offerStore.put(offer)
  t.assert(offerStorePutOk)

  // Create deal message from offer
  const deal = {
    ...offer,
    offer: aggregate.link.toString(),
    stat: Status.Approved
  }

  const { ok, error } = await aggregateAccept({
    deal,
    dealerServiceConnection: dealerService.connection,
    dealerInvocationConfig: invocationConfig,
    offerStore
  })

  t.assert(ok)
  t.falsy(error)

  // Invocation
  const invCapDealTracker = await dealAdd.promise
  t.is(invCapDealTracker.can, 'deal/add')
})

test('fails to invoke aggregate accept if unexpected deal status', async t => {
  const { s3 } = t.context
  const offerBucketName = await createBucket(s3)
  const dealAdd = pDefer()

  // context
  const offerStore = createBucketStoreClient(s3, {
    name: offerBucketName,
    encodeRecord: offerEncode.record,
    encodeKey,
    decodeRecord: offerDecode.record,
  })
  const { invocationConfig, dealerService } = await getService({
    onCall: dealAdd
  })

  // Create offer
  const { pieces, aggregate } = await randomAggregate(100, 128)
  const storefront = 'did:web:web3.storage'
  const insertedAt = Date.now()
  const offer = {
    aggregate: aggregate.link,
    pieces: pieces.map(p => p.link),
    storefront,
    insertedAt
  }

  // Store Offer
  const { ok: offerStorePutOk } = await offerStore.put(offer)
  t.assert(offerStorePutOk)

  // Create deal message from offer
  const deal = {
    ...offer,
    offer: aggregate.link.toString(),
    stat: Status.Offered
  }

  const { ok, error } = await aggregateAccept({
    deal,
    dealerServiceConnection: dealerService.connection,
    dealerInvocationConfig: invocationConfig,
    offerStore
  })

  t.assert(error)
  t.falsy(ok)
  t.is(error?.name, UnexpectedDealForApprovalErrorName)
})

test('fails to invoke aggregate accept if handler fails', async t => {
  const { s3 } = t.context
  const offerBucketName = await createBucket(s3)
  const dealAdd = pDefer()

  // context
  const offerStore = createBucketStoreClient(s3, {
    name: offerBucketName,
    encodeRecord: offerEncode.record,
    encodeKey,
    decodeRecord: offerDecode.record,
  })
  const { invocationConfig, dealerService } = await getService({
    onCall: dealAdd,
    mustFail: true
  })

  // Create offer
  const { pieces, aggregate } = await randomAggregate(100, 128)
  const storefront = 'did:web:web3.storage'
  const insertedAt = Date.now()
  const offer = {
    aggregate: aggregate.link,
    pieces: pieces.map(p => p.link),
    storefront,
    insertedAt
  }

  // Store Offer
  const { ok: offerStorePutOk } = await offerStore.put(offer)
  t.assert(offerStorePutOk)

  // Create deal message from offer
  const deal = {
    ...offer,
    offer: aggregate.link.toString(),
    stat: Status.Approved
  }

  const { ok, error } = await aggregateAccept({
    deal,
    dealerServiceConnection: dealerService.connection,
    dealerInvocationConfig: invocationConfig,
    offerStore
  })

  t.assert(error)
  t.falsy(ok)
  t.is(error?.name, OperationErrorName)
})

/**
 * @param {import('@web3-storage/filecoin-api/types').DealerMessageRecord} record 
 */
function encodeKey (record) {
  return record.aggregate.toString()
}

/**
 * @param {object} options
 * @param {import('p-defer').DeferredPromise<any>} options.onCall
 * @param {boolean} [options.mustFail]
 */
async function getService (options) {
  const { dealer } = await getDealerCtx()
  const dealerService = await getDealerServiceServer(dealer.raw, {
    onCall: (invCap) => {
      options.onCall.resolve(invCap)
    },
    mustFail: options.mustFail
  })
  const issuer = getServiceSigner(dealer)
  const audience = dealerService.connection.id
  /** @type {import('@web3-storage/filecoin-client/types').InvocationConfig} */
  const invocationConfig = {
    issuer,
    audience,
    with: issuer.did(),
  }

  return {
    invocationConfig,
    dealerService
  }
}
