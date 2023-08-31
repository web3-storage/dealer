import { StoreOperationFailed } from '@web3-storage/filecoin-api/errors'

import { dealerStore } from '../../src/workflow/dealer-store.js'
import { dealTableProps } from '../../src/store/index.js'
import { createTableStoreClient } from '../../src/store/table-client.js'
import { encode as offerEncode } from '../../src/data/offer.js'
import { encode as dealEncode, decode as dealDecode } from '../../src/data/deal.js'

import { testWorkflow as test } from '../helpers/context.js'
import { createDynamodDb, createTable } from '../helpers/resources.js'
import { randomAggregate } from '@web3-storage/filecoin-api/test'

test.beforeEach(async (t) => {
  Object.assign(t.context, {
    dynamoClient: await createDynamodDb()
  })
})

test('can store an offer message record into the deal store', async t => {
  const { dynamoClient } = t.context
  const tableName = await createTable(dynamoClient, dealTableProps)

  // context
  const dealStore = createTableStoreClient(dynamoClient, {
    tableName,
    encodeRecord: dealEncode.record,
    encodeKey: dealEncode.key,
    decodeRecord: dealDecode.record
  })

  const { pieces, aggregate } = await randomAggregate(100, 128)
  const storefront = 'did:web:web3.storage'
  const label = 'label'
  const insertedAt = Date.now()

  const offer = {
    aggregate: aggregate.link,
    pieces: pieces.map(p => p.link),
    storefront,
    label,
    insertedAt
  }
  const offerRecord = await offerEncode.message(offer, aggregate.link.toString())
  const { ok, error } = await dealerStore({
    offerRecord,
    dealStore
  })

  t.truthy(ok)
  t.falsy(error)
})

test('fails to store an offer message record if store fails', async t => {
  const { pieces, aggregate } = await randomAggregate(100, 128)
  const storefront = 'did:web:web3.storage'
  const label = 'label'
  const insertedAt = Date.now()

  const offer = {
    aggregate: aggregate.link,
    pieces: pieces.map(p => p.link),
    storefront,
    label,
    insertedAt
  }
  const offerRecord = await offerEncode.message(offer, aggregate.link.toString())
  const { ok, error } = await dealerStore({
    offerRecord,
    dealStore: {
      put: async () => {
        return {
          error: new StoreOperationFailed('failed to store')
        }
      },
      get: async () => {
        return {
          error: new StoreOperationFailed('failed to get from store')
        }
      }
    }
  })

  t.truthy(error)
  t.falsy(false)
})
