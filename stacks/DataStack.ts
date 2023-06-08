import {
  Bucket,
  Config,
  Table,
  StackContext
} from 'sst/constructs';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';

import { arrangedOfferTableProps } from '../packages/core/tables/index';
import {
  getBucketConfig,
  getConstructName,
  getCustomDomain,
  setupSentry
} from './config';

export function DataStack({ app, stack }: StackContext) {
  // Setup app monitoring with Sentry
  setupSentry(app, stack)

  const ucanLogBasicAuth = new Config.Secret(stack, 'UCAN_LOG_BASIC_AUTH')
  const privateKey = new Config.Secret(stack, 'PRIVATE_KEY')
  const customDomain = getCustomDomain(stack.stage, process.env.HOSTED_ZONE)

  const bucket = getBucketConfig('offer-store', stack.stage)
  const offerBucket = new Bucket(stack, bucket.bucketName, {
    cors: true,
    cdk: {
      bucket
    }
  })

  /**
   * This table tracks CARs pending a Filecoin deal together with their metadata.
   */
  const tableName = getConstructName('arranged-offer', stack.stage)
  const arrangedOfferTable = new Table(stack, tableName, {
    ...arrangedOfferTableProps,
    // information that will be written to the stream
    stream: 'new_and_old_images',
  })

  // invoke offer arrange once stat is set
  arrangedOfferTable.addConsumers(stack, {
    offerArrange: {
      function: {
        handler: 'packages/functions/src/data/offer-arrange.main',
        environment: {
          SPADE_PROXY_DID: process.env.SPADE_PROXY_DID ?? '',
          SPADE_PROXY_URL: customDomain?.domainName ? `https://${customDomain?.domainName}` : ''
        },
        permissions: [],
        timeout: 3 * 60,
        bind: [
          privateKey
        ]
      },
      cdk: {
        eventSource: {
          batchSize: 1,
          // Start reading at the last untrimmed record in the shard in the system.
          startingPosition: StartingPosition.TRIM_HORIZON,
          // TODO: Add error queue
          // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.DynamoEventSourceProps.html#onfailure
        }
      },
      filters: [
        // Trigger when state changed
        {
          dynamodb: {
            NewImage: {
              stat: {
                S: ['accepted', 'rejected']
              }
            }
          }
        }
      ]
    }
  })

  return {
    offerBucket,
    arrangedOfferTable,
    ucanLogBasicAuth,
    privateKey
  }
}
