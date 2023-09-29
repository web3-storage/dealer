import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import pDefer from 'p-defer'

import { dealTrack } from '../../src/workflow/deal-track.js'
import { dealTableProps } from '../../src/store/index.js'
import { encode as encodeDeal, Status } from '../../src/data/deal.js'

import { getServiceSigner } from '../../src/service.js'
import { testWorkflow as test } from '../helpers/context.js'
import { createDynamodDb, createTable } from '../helpers/resources.js'
import { getDealTrackerServiceServer, getDealTrackerCtx } from '../helpers/ucanto.js'
import { randomAggregate } from '@web3-storage/filecoin-api/test'

/**
 * @typedef {import('../helpers/ucanto.js').DealInfoSuccess} DealInfoSuccess
 */

test.beforeEach(async (t) => {
  Object.assign(t.context, {
    dynamoClient: await createDynamodDb()
  })
})

test('can track a stored deal pending approval or rejection', async t => {
  const { dynamoClient } = t.context
  const tableName = await createTable(dynamoClient, dealTableProps)
  const dealInfoCall = pDefer()
  const dealStore = new Map()
  const { invocationConfig, dealTrackerService } = await getService(dealStore, {
    onCall: dealInfoCall
  })

  const { pieces, aggregate } = await randomAggregate(100, 128)
  const storefront = 'did:web:web3.storage'
  const insertedAt = Date.now()

  const offer = {
    aggregate: aggregate.link,
    pieces: pieces.map(p => p.link),
    storefront,
    offer: aggregate.link.toString(),
    stat: Status.Offered,
    insertedAt
  }

  const putCmd = new PutItemCommand({
    TableName: tableName,
    Item: marshall(encodeDeal.record(offer), {
      removeUndefinedValues: true
    }),
  })

  const res = await dynamoClient.send(putCmd)
  t.is(res.$metadata.httpStatusCode, 200)

  // Should not swap until ready
  const { ok: okBeforeDeal, error: errorBeforeDeal } = await dealTrack({
    tableName,
    tableClient: dynamoClient,
    dealTrackerInvocationConfig: invocationConfig,
    dealTrackerServiceConnection: dealTrackerService.connection
  })

  t.assert(okBeforeDeal)
  t.falsy(errorBeforeDeal)
  t.is(okBeforeDeal?.pendingCount, 1)
  t.is(okBeforeDeal?.updatedCount, 0)

  // Invocation
  const invCapDealTracker = await dealInfoCall.promise
  t.is(invCapDealTracker.can, 'chain-tracker/info')

  // At some point, there is a deal for given aggregate on chain
  dealStore.set(aggregate.link.toString(), {
    deals: {
      '12345': {
        provider: 'f099'
      }
    }
  })

  // Should swap when done
  const { ok: okAfterDeal, error: errorAfterDeal } = await dealTrack({
    tableName,
    tableClient: dynamoClient,
    dealTrackerInvocationConfig: invocationConfig,
    dealTrackerServiceConnection: dealTrackerService.connection
  })

  t.assert(okAfterDeal)
  t.falsy(errorAfterDeal)
  t.is(okAfterDeal?.pendingCount, 0)
  t.is(okAfterDeal?.updatedCount, 1)
})

// TODO: Error

/**
 * @param {Map<string, DealInfoSuccess | undefined>} store
 * @param {object} options
 * @param {import('p-defer').DeferredPromise<any>} options.onCall
 * @param {boolean} [options.mustFail]
 */
async function getService (store, options) {
  const { dealer, dealTracker } = await getDealTrackerCtx()
  const dealTrackerService = await getDealTrackerServiceServer(dealTracker.raw, store, {
    onCall: (invCap) => {
      options.onCall.resolve(invCap)
    },
    mustFail: options.mustFail
  })
  const issuer = getServiceSigner(dealer)
  const audience = dealTrackerService.connection.id
  /** @type {import('@web3-storage/filecoin-client/types').InvocationConfig} */
  const invocationConfig = {
    issuer,
    audience,
    with: issuer.did(),
  }

  return {
    invocationConfig,
    dealTrackerService
  }
}
