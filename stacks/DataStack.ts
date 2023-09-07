import {
  Bucket,
  Table,
  StackContext
} from 'sst/constructs';

import { dealTableProps } from '../packages/core/src/store/index';
import { getBucketConfig } from './config';

export function DataStack({ stack }: StackContext) {
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
  const dealTable = new Table(stack, 'deal-store', {
    ...dealTableProps,
  })

  return {
    offerBucket,
    dealTable
  }
}
