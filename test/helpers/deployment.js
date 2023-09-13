import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

export function getStage () {
  const stage = process.env.SST_STAGE || process.env.SEED_STAGE_NAME
  if (stage) {
    return stage
  }

  const f = fs.readFileSync(path.join(
    process.cwd(),
    '.sst/stage'
  ))

  return f.toString()
}

export const getStackName = () => {
  const stage = getStage()
  return `${stage}-dealer`
}

export const getApiEndpoint = () => {
  const stage = getStage()

  // CI/CD deployment
  if (process.env.SEED_APP_NAME) {
    return `https://${stage}.dealer.web3.storage`
  }

  const require = createRequire(import.meta.url)
  const testEnv = require(path.join(
    process.cwd(),
    '.sst/outputs.json'
  ))

  // Get API endpoint
  const id = 'ApiStack'
  return testEnv[`${getStackName()}-${id}`].ApiEndpoint
}

export const getAwsRegion = () => {
  // CI/CD deployment
  if (process.env.SEED_APP_NAME) {
    return 'us-east-2'
  }

  return 'us-west-2'
}

export const getOfferStoreBucketInfo = () => {
  const stage = getStage()
  const region = getAwsRegion()
  const client = new S3Client({
    region
  })

  // CI/CD deployment
  if (process.env.SEED_APP_NAME) {
    return {
      client,
      bucket: `${stage}-dealer-offer-store-0`,
      region
    }
  }

  const require = createRequire(import.meta.url)
  const testEnv = require(path.join(
    process.cwd(),
    '.sst/outputs.json'
  ))

  // Get bucket Name
  const id = 'DataStack'
  return {
    client,
    bucket: /** @type {string} */ (testEnv[`${getStackName()}-${id}`].OfferBucketName),
    region
  }
}

export const getDealStoreDynamoDb = () => {
  // CI/CD deployment
  if (process.env.SEED_APP_NAME) {
    return getDynamoDb('deal-store')
  }

  const require = createRequire(import.meta.url)
  const testEnv = require(path.join(
    process.cwd(),
    '.sst/outputs.json'
  ))

  // Get Bucket Name
  const id = 'DataStack'
  const tableName = testEnv[`${getStackName()}-${id}`].DealTableName

  return getDynamoDb(tableName)
}

/**
 * @param {string} tableName 
 */
export const getDynamoDb = (tableName) => {
  const region = getAwsRegion()
  const endpoint = `https://dynamodb.${region}.amazonaws.com`

  return {
    client: new DynamoDBClient({
      region,
      endpoint
    }),
    tableName: `${getStackName()}-${tableName}`,
    region,
    endpoint
  }
}
