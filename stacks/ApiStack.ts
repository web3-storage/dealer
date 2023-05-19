import {
  Api,
  StackContext,
} from 'sst/constructs';

import { getApiPackageJson, getCustomDomain, getGitInfo } from './config';

export function ApiStack({ stack }: StackContext) {
  // Setup API
  const customDomain = getCustomDomain(stack.stage, process.env.HOSTED_ZONE)
  const pkg = getApiPackageJson()
  const git = getGitInfo()

  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        environment: {
          NAME: pkg.name,
          VERSION: pkg.version,
          COMMIT: git.commmit,
          STAGE: stack.stage,
        }
      }
    },
    routes: {
      'GET /version': 'packages/functions/src/api/version.handler',
    }
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
    CustomDomain: customDomain ? `https://${customDomain?.domainName}` : 'Set HOSTED_ZONE in env to deploy to a custom domain'
  })
}
