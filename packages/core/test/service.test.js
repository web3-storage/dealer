/* eslint-disable no-loop-func */
import { Dealer } from '@web3-storage/filecoin-api/test'
import { ed25519 } from '@ucanto/principal'
import { Consumer } from 'sqs-consumer'
import pWaitFor from 'p-wait-for'
import delay from 'delay'

import { dealTableProps } from '../src/store/index.js'
import { createBucketStoreClient } from '../src/store/bucket-client.js'
import { createTableStoreClient } from '../src/store/table-client.js'
import { createQueueClient } from '../src/queue/client.js'
import { encode as offerEncode, decode as offerDecode } from '../src/data/offer.js'
import { encode as dealEncode, decode as dealDecode } from '../src/data/deal.js'

import { testService as test } from './helpers/context.js'
import {
  createS3,
  createBucket,
  createDynamodDb,
  createTable,
  createQueue
} from './helpers/resources.js'

test.beforeEach(async (t) => {
  const sqs = await createQueue()

  /** @type {import('@aws-sdk/client-sqs').Message[]} */
  const queuedMessages = []
  const queueConsumer = Consumer.create({
    queueUrl: sqs.queueUrl,
    sqs: sqs.client,
    handleMessage: (message) => {
      queuedMessages.push(message)
      return Promise.resolve()
    }
  })

  Object.assign(t.context, {
    dynamoClient: await createDynamodDb(),
    s3: (await createS3()).client,
    sqsClient: sqs.client,
    queueName: sqs.queueName,
    queueUrl: sqs.queueUrl,
    queueConsumer,
    queuedMessages
  })
})

test.beforeEach(async t => {
  t.context.queueConsumer.start()
  await pWaitFor(() => t.context.queueConsumer.isRunning)
})

test.afterEach(async t => {
  t.context.queueConsumer.stop()
  await delay(1000)
})

for (const [title, unit] of Object.entries(Dealer.test)) {
  const define = title.startsWith('only ')
    // eslint-disable-next-line no-only-tests/no-only-tests
    ? test.only
    : title.startsWith('skip ')
    ? test.skip
    : test

  define(title, async (t) => {
    const { s3, dynamoClient, sqsClient, queueUrl, queuedMessages } = t.context
    const offerBucketName = await createBucket(s3)
    const tableName = await createTable(dynamoClient, dealTableProps)
    
    // context
    const offerStore = createBucketStoreClient(s3, {
      name: offerBucketName,
      encodeRecord: offerEncode.record,
      encodeKey,
      decodeRecord: offerDecode.record,
    })
    const addQueue = createQueueClient(sqsClient, {
      queueUrl,
      encodeMessage: offerEncode.message,
      encodeKey,
      store: offerStore
    })
    const dealStore = createTableStoreClient(dynamoClient, {
      tableName,
      encodeRecord: dealEncode.record,
      encodeKey: dealEncode.key,
      decodeRecord: dealDecode.record
    })

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
        dealStore,
        addQueue,
        queuedMessages
      }
    )
  })
}

/**
 * @param {import('@web3-storage/filecoin-api/types').DealerMessageRecord} record 
 */
function encodeKey (record) {
  return record.aggregate.toString()
}