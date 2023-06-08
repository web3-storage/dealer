import * as Sentry from '@sentry/serverless'

import { mutateOffersToArrange } from '@spade-proxy/core/arrange-offers'
import { createArrangedOfferStore } from '@spade-proxy/core/tables/arranged-offer-store'
import { createAggregateStore } from '@spade-proxy/core/tables/aggregate-store'

import { mustGetEnv } from '../utils'

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
const AWS_REGION = process.env.AWS_REGION || 'us-west-2'

export async function main() {
  const { arrangedOfferTableName } = getLambdaEnv()
  const arrangedOfferStore = createArrangedOfferStore(AWS_REGION, arrangedOfferTableName)
  const aggregateStore = createAggregateStore()
  
  return mutateOffersToArrange(arrangedOfferStore, aggregateStore)
}

function getLambdaEnv () {
  return {
    arrangedOfferTableName: mustGetEnv('ARRANGED_OFFER_TABLE_NAME'),
  }
}
