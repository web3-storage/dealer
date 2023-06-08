import * as Sentry from '@sentry/serverless'

import { mergeOffers } from '@spade-proxy/core/merge-offers'
import { createOfferStore } from '@spade-proxy/core/buckets/offer-store'
import { createArrangedOfferStore } from '@spade-proxy/core/tables/arranged-offer-store'

import { mustGetEnv } from '../utils'

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
const AWS_REGION = process.env.AWS_REGION || 'us-west-2'

export async function main() {
  const { offerBucketName, arrangedOfferTableName } = getLambdaEnv()
  const date = new Date()
  const arrangedOfferStore = createArrangedOfferStore(AWS_REGION, arrangedOfferTableName)
  const offerStore = createOfferStore(AWS_REGION, offerBucketName, arrangedOfferStore)
  
  return mergeOffers(date, offerStore)
}

function getLambdaEnv () {
  return {
    offerBucketName: mustGetEnv('OFFER_BUCKET_NAME'),
    arrangedOfferTableName: mustGetEnv('ARRANGED_OFFER_TABLE_NAME'),
  }
}
