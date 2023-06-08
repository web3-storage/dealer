import {
  Api,
  StackContext,
  use
} from 'sst/constructs';

import { DataStack } from './DataStack';
import {
  getApiPackageJson,
  getCustomDomain,
  getGitInfo,
  setupSentry
} from './config';

export function ApiStack({ app, stack }: StackContext) {
  const {
    offerBucket,
    arrangedOfferTable,
    privateKey,
    ucanLogBasicAuth
  } = use(DataStack)

  // Setup app monitoring with Sentry
  setupSentry(app, stack)
  
  // Setup API
  const customDomain = getCustomDomain(stack.stage, process.env.HOSTED_ZONE)
  const pkg = getApiPackageJson()
  const git = getGitInfo()

  const api = new Api(stack, 'api', {
    customDomain,
    defaults: {
      function: {
        permissions: [
          arrangedOfferTable,
          offerBucket
        ],
        environment: {
          OFFER_BUCKET_NAME: offerBucket.bucketName,
          ARRANGED_OFFER_TABLE_NAME: arrangedOfferTable.tableName,
          NAME: pkg.name,
          VERSION: pkg.version,
          COMMIT: git.commmit,
          STAGE: stack.stage,
          SPADE_PROXY_DID: process.env.SPADE_PROXY_DID ?? '',
          UCAN_LOG_URL: process.env.UCAN_LOG_URL ?? '',
        },
        bind: [
          privateKey,
          ucanLogBasicAuth
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
