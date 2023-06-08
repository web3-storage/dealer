import { Cron, StackContext, use } from 'sst/constructs';
import { DataStack } from './DataStack';

export function CronStack({ stack }: StackContext) {
  const { offerBucket, arrangedOfferTable } = use(DataStack)

  new Cron(stack, 'arrange-offers', {
    schedule: 'rate(30 minutes)',
    job: {
      function: {
        handler: 'packages/functions/src/cron/trigger-offers-ready-to-arrange.main',
        environment: {
          ARRANGED_OFFER_TABLE_NAME: arrangedOfferTable.tableName,
        }
      },
    }
  })

  // Write finalized files
  const mergeOfferCron = new Cron(stack, 'merge-offer-cron', {
    schedule: 'cron(0,15,30,45 * * * ? *)',
    job: {
      function: {
        handler: 'packages/functions/src/cron/merge-offers.main',
        environment: {
          OFFER_BUCKET_NAME: offerBucket.bucketName,
          ARRANGED_OFFER_TABLE_NAME: arrangedOfferTable.tableName,
        }
      },
    }
  })

  mergeOfferCron.attachPermissions([
    offerBucket
  ])
}
