import {
  Api,
  Config,
  StackContext,
  use
} from 'sst/constructs';

import { DataStack } from './DataStack';
import { ProcessorStack } from './ProcessorStack';
import {
  getApiPackageJson,
  getCustomDomain,
  getGitInfo,
  setupSentry
} from './config';

export function ApiStack({ app, stack }: StackContext) {
  const { offerBucket, dealTable } = use(DataStack)
  const { dealerQueue } = use(ProcessorStack)

  // Setup app monitoring with Sentry
  setupSentry(app, stack)
  
  // Setup API
  const customDomain = getCustomDomain(stack.stage, process.env.HOSTED_ZONE)
  const pkg = getApiPackageJson()
  const git = getGitInfo()
  const privateKey = new Config.Secret(stack, 'PRIVATE_KEY')
  const ucanLogBasicAuth = new Config.Secret(stack, 'UCAN_LOG_BASIC_AUTH')

  const api = new Api(stack, 'api', {
    customDomain,
    defaults: {
      function: {
        permissions: [
          offerBucket,
          dealTable,
          dealerQueue
        ],
        environment: {
          NAME: pkg.name,
          VERSION: pkg.version,
          COMMIT: git.commmit,
          STAGE: stack.stage,
          DID: process.env.DID ?? '',
          UCAN_LOG_URL: process.env.UCAN_LOG_URL ?? '',
          DEALER_QUEUE_URL: dealerQueue.queueUrl,
          DEALER_QUEUE_REGION: stack.region,
          OFFER_STORE_BUCKET_NAME: offerBucket.bucketName
        },
        bind: [
          privateKey,
          ucanLogBasicAuth,
          offerBucket,
          dealTable
        ]
      }
    },
    routes: {
      'POST /':       'packages/functions/src/api/ucan-invocation-router.handler',
      'GET /version': 'packages/functions/src/api/version.handler',
      'GET /error':   'packages/functions/src/api/error.handler',
    }
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
    CustomDomain: customDomain ? `https://${customDomain?.domainName}` : 'Set HOSTED_ZONE in env to deploy to a custom domain'
  })
}
