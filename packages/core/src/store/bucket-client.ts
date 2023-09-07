import {
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import pRetry from 'p-retry'
import { StoreOperationFailed, StoreNotFound, EncodeRecordFailed } from '@web3-storage/filecoin-api/errors'
import { Store } from '@web3-storage/filecoin-api/types'

import { connectBucket, BucketTarget } from './index.js'

export function createBucketStoreClient <Record, EncodedRecord extends StoreRecord> (conf: BucketTarget, context: BucketContext<Record, EncodedRecord>): Store<Record> {
  const bucketClient = connectBucket(conf)

  return {
    put: async (record) => {
      let encodedKey
      try {
        encodedKey = context.encodeKey(record)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      let encodedRecord
      try {
        encodedRecord = await context.encodeRecord(record)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      const putCmd = new PutObjectCommand({
        Bucket: context.name,
        Key: encodedKey,
        Body: encodedRecord
      })

      // retry to avoid throttling errors
      try {
        await pRetry(() => bucketClient.send(putCmd))
      } catch (error: any) {
        return {
          error: new StoreOperationFailed(error.message)
        }
      }

      return {
        ok: {}
      }
    },
    get: async (record) => {
      let encodedKey
      try {
        encodedKey = await context.encodeKey(record)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      const putCmd = new GetObjectCommand({
        Bucket: context.name,
        Key: encodedKey
      })

      let res
      try {
        res = await bucketClient.send(putCmd)
      } catch (error: any) {
        return {
          error: new StoreOperationFailed(error.message)
        }
      }

      if (!res || !res.Body) {
        return {
          error: new StoreNotFound('item not found in store')
        }
      }

      const encodedRecord = {
        key: encodedKey,
        value: await res.Body.transformToString()
      } as EncodedRecord

      return {
        ok: await context.decodeRecord(encodedRecord)
      }
    }
  }
}

export type StoreRecord = {
  key: string,
  value: string
}

export interface BucketContext<Record, EncodedRecord extends StoreRecord> {
  name: string
  encodeRecord: (record: Record) => string
  encodeKey: (record: Record) => string
  decodeRecord: (record: EncodedRecord) => Record
}
