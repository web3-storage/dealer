import * as Sentry from '@sentry/serverless'

/**
 * AWS HTTP Gateway handler for GET /error
 */
export async function errorGet () {
  throw new Error('API Error')
}

export const handler = Sentry.AWSLambda.wrapHandler(errorGet)
