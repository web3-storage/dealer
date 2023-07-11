import {
  Bucket,
  Table,
  StackContext
} from 'sst/constructs';

import { arrangedOfferTableProps } from '../packages/core/tables/index'

import { getBucketConfig } from './config';

export function DataStack({ stack }: StackContext) {
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
  const arrangedOfferTable = new Table(stack, 'arranged-offer', {
    ...arrangedOfferTableProps,
  })

  return {
    offerBucket,
    arrangedOfferTable
  }
}
