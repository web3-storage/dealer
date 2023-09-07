import * as Sentry from '@sentry/serverless'
import { Table } from 'sst/node/table'
import { SQSEvent } from 'aws-lambda'

import { createTableStoreClient } from '@dealer/core/src/store/table-client'
import { encode as dealEncode, decode as dealDecode } from '@dealer/core/src/data/deal'
import { dealerStore } from '@dealer/core/src/workflow/dealer-store'

import { mustGetEnv } from '../utils'

/**
 * Get EventRecord from the SQS Event triggering the handler.
 * The event contains a batch of `deal`s provided from producer of size 1.
 * The deal should be written into a store to be processed.
 */
async function dealerStoreWorkflow (sqsEvent: SQSEvent) {
  const {
    dealTableName,
    dealTableRegion,
  } = getLambdaEnv()

  if (sqsEvent.Records.length !== 1) {
    return {
      statusCode: 400,
      body: `Expected 1 sqsEvent per invocation but received ${sqsEvent.Records.length}`
    }
  }

  // context
  const dealStore = createTableStoreClient({
    region: dealTableRegion
  }, {
    tableName: dealTableName,
    encodeRecord: dealEncode.record,
    encodeKey: dealEncode.key,
    decodeRecord: dealDecode.record
  })

  const offerRecord = sqsEvent.Records[0].body

  const { ok, error } = await dealerStore({
    offerRecord,
    dealStore
  })

  if (error) {
    return {
      statusCode: 500,
      body: error.message || 'failed to store deal'
    }
  }

  return {
    statusCode: 200,
    body: ok
  }
}

export const workflow = Sentry.AWSLambda.wrapHandler(dealerStoreWorkflow)

/**
 * Get Env validating it is set.
 */
function getLambdaEnv () {
  return {
    dealTableName: Table['deal-store'].tableName,
    dealTableRegion: mustGetEnv('AWS_REGION'),
  }
}

declare module 'sst/node/table' {
  export interface TableResources {
    'deal-store': {
      tableName: string;
    };
  }
}
