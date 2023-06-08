import { Cron, StackContext, use } from 'sst/constructs';
import { DataStack } from './DataStack';

import {
  getConstructName
} from './config';

export function CronStack({ stack }: StackContext) {
  const { offerBucket, arrangedOfferTable } = use(DataStack)

  const arrangeOffersCronName = getConstructName('arrange-offers-cron', stack.stage)
  new Cron(stack, arrangeOffersCronName, {
    // schedule: 'rate(1 minute)',
    schedule: 'rate(30 minutes)',
    job: {
      function: {
        handler: 'packages/functions/src/cron/trigger-offers-ready-to-arrange.main',
        environment: {
          ARRANGED_OFFER_TABLE_NAME: arrangedOfferTable.tableName,
        },
        permissions: [arrangedOfferTable]
      },
    }
  })

  // Write finalized files
  const mergeOfferCronName = getConstructName('merge-offer-cron', stack.stage)
  const mergeOfferCron = new Cron(stack, mergeOfferCronName, {
    schedule: 'cron(0,15,30,45 * * * ? *)',
    job: {
      function: {
        handler: 'packages/functions/src/cron/merge-offers.main',
        environment: {
          OFFER_BUCKET_NAME: offerBucket.bucketName,
          ARRANGED_OFFER_TABLE_NAME: arrangedOfferTable.tableName,
        },
        permissions: [offerBucket, arrangedOfferTable]
      },
    }
  })

  mergeOfferCron.attachPermissions([
    offerBucket
  ])
}
