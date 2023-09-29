import {
  Bucket,
  Table,
  Config,
  StackContext
} from 'sst/constructs';

import { dealTableProps } from '../packages/core/src/store/index';
import { getBucketConfig } from './config';

export function DataStack({ stack }: StackContext) {
  const privateKey = new Config.Secret(stack, 'PRIVATE_KEY')

  /**
   * This bucket contains the information of each deal offer received by storefronts.
   */
  const offerBucketConfig = getBucketConfig('offer-store', stack.stage)
  const offerBucket = new Bucket(stack, offerBucketConfig.bucketName, {
    cors: true,
    cdk: {
      bucket: offerBucketConfig
    }
  })

  /**
   * This table tracks the state of deals offered to a broker.
   */
  const dealTableName = 'deal-store'
  const dealTable = new Table(stack, dealTableName, {
    ...dealTableProps,
    // information that will be written to the stream
    stream: 'new_and_old_images'
  })

  stack.addOutputs({
    OfferBucketName: offerBucketConfig.bucketName,
    DealTableName: dealTableName,
  })

  return {
    offerBucket,
    dealTable,
    privateKey
  }
}
