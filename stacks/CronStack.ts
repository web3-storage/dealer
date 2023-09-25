import { Cron, StackContext, use } from 'sst/constructs';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';

import { Status } from '../packages/core/src/data/deal';

import { DataStack } from './DataStack';
import {
  getCustomDomain,
  getResourceName,
  setupSentry,
  getEnv
} from './config';

export function CronStack({ app, stack }: StackContext) {
  // Setup app monitoring with Sentry
  setupSentry(app, stack)

  const { DID, DEAL_TRACKER_DID, DEAL_TRACKER_URL, DEAL_TRACKER_PROOF } = getEnv()
  const { dealTable, offerBucket, privateKey } = use(DataStack)
  const apiCustomDomain = getCustomDomain(stack.stage, process.env.HOSTED_ZONE)

  /**
   * DynamoDB Stream consumer that will self invoke `aggregate/accept`.
   * This enables `deal-track` workflow to only perform one mutation (mutate table state),
   * while the effect of `stat` mutation triggers a new workflow to invoke `aggregate/accept`.
   */
  dealTable.addConsumers(stack, {
    aggregateAccept: {
      function: {
        handler: 'packages/functions/src/cron/aggregate-accept.main',
        environment: {
          DID,
          URL: apiCustomDomain?.domainName ? `https://${apiCustomDomain?.domainName}` : '',
          OFFER_STORE_BUCKET_NAME: offerBucket.bucketName
        },
        bind: [
          privateKey
        ],
      },
      cdk: {
        // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.DynamoEventSourceProps.html#filters
        eventSource: {
          batchSize: 1,
          // Start reading at the last untrimmed record in the shard in the system.
          startingPosition: StartingPosition.TRIM_HORIZON,
        },
      },
      filters: [
        // Trigger when there is enough data abd state is ingesting
        {
          dynamodb: {
            NewImage: {
              stat: {
                N: [`${Status.Approved}`, `${Status.Rejected}`]
              }
            }
          }
        }
      ]
    }
  })

  /**
   * CRON to track deals pending resolution
   */
  const dealTrackCronName = getResourceName('deal-track-cron', stack.stage)
  const dealTrackCron = new Cron(stack, dealTrackCronName, {
    schedule: 'rate(5 minutes)',
    job: {
      function: {
        handler: 'packages/functions/src/cron/deal-track.main',
        environment: {
          DEAL_TRACKER_DID,
          DEAL_TRACKER_URL,
          DEAL_TRACKER_PROOF
        },
        bind: [
          dealTable
        ],
      }
    }
  })

  return {
    dealTrackCron
  }
}
