/* eslint-disable no-loop-func */
import { Aggregate } from '@web3-storage/aggregate-api/test'
import { ed25519 } from '@ucanto/principal'

import { test } from './helpers/context.js'
import {
  createS3,
  createBucket,
  createDynamodDb,
  createTable,
} from './helpers/resources.js'

import { useOfferStore } from '../buckets/offer-store.js'
// TODO: Include official one in follow up
// import { useAggregateStore } from '../tables/aggregate-store.js'
import { useArrangedOfferStore } from '../tables/arranged-offer-store.js'
import { arrangedOfferTableProps } from '../tables/index.js'

test.before(async (t) => {
  Object.assign(t.context, {
    dynamo: await createDynamodDb(),
    s3: (await createS3()).client,
  })
})

for (const [title, unit] of Object.entries(Aggregate.test)) {
  test(title, async (t) => {
    const { dynamo, s3 } = t.context
    const bucketName = await createBucket(s3)

    const arrangedOfferStore = useArrangedOfferStore(
      dynamo,
      await createTable(dynamo, arrangedOfferTableProps)
    )
    const offerStore = useOfferStore(s3, bucketName, arrangedOfferStore)
    const aggregateStore = getAggregateStore()

    const signer = await ed25519.generate()
    const id = signer.withDID('did:web:test.web3.storage')

    await unit(
      {
        ok: (actual, message) => t.truthy(actual, message),
        equal: (actual, expect, message) =>
          t.is(actual, expect, message ? String(message) : undefined),
        deepEqual: (actual, expect, message) =>
          t.deepEqual(actual, expect, message ? String(message) : undefined),
      },
      {
        id,
        errorReporter: {
          catch(error) {
            t.fail(error.message)
          },
        },
        offerStore,
        aggregateStore,
        aggregateStoreBackend: aggregateStore,
        arrangedOfferStore
      }
    )
  })
}

// TODO: we will have the real implementation in follow up. So just an in memory DB for now.
function getAggregateStore () {
  /** @type {Map<string, unknown[]>} */
  const items = new Map()

  /** @type {import('@web3-storage/aggregate-api').AggregateStoreBackend & import('@web3-storage/aggregate-api').AggregateStore} */
  const store = {
    get: async (commitmentProof) => {
      return Promise.resolve(items.get(commitmentProof.toString()))
    },
    put: async (commitmentProof, deal) => {
      const dealEntries = items.get(commitmentProof.toString())
      let newEntries
      if (dealEntries) {
        newEntries = [...dealEntries, deal]
        items.set(commitmentProof.toString(), newEntries)
      } else {
        newEntries = [deal]
        items.set(commitmentProof.toString(), newEntries)
      }

      return Promise.resolve()
    }
  }

  return store
}