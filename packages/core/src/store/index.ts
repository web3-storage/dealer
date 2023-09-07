import { TableProps } from 'sst/constructs'
import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

export interface ResourceConnect {
  region: string
}

export type BucketTarget = S3Client | ResourceConnect
export type TableTarget = DynamoDBClient | ResourceConnect

export function connectBucket (target: BucketTarget) {
  if (target instanceof S3Client) {
    return target
  }
  return new S3Client(target)
}

export function connectTable (target: TableTarget) {
  if (target instanceof DynamoDBClient) {
    return target
  }

  return new DynamoDBClient(target)
}

export const dealTableProps = {
  fields: {
    aggregate: 'string', // `bafcommp...1`
    stat: 'number', // 0 is `OFFERED` | 1 is `APPROVED` | 2 is `REJECTED`
    storefront: 'string', // 'did:web:web3.storage'
    offer: 'string', // 'YYYY-MM-DDTHH:MM:SS bafcommp...1'
  },
  // name must be unique to satisfy index constraint
  primaryIndex: { partitionKey: 'aggregate' },
  globalIndexes: {
    indexStat: {
      partitionKey: 'stat',
      sortKey: 'aggregate',
      projection: 'keys_only'
    }
  }
} as TableProps
