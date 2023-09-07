import { PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import { StoreOperationFailed, StoreNotFound, EncodeRecordFailed } from '@web3-storage/filecoin-api/errors'
import { Store } from '@web3-storage/filecoin-api/types'

import { connectTable, TableTarget } from './index.js'

export function createTableStoreClient <Record, EncodedRecord, EncodedKey> (conf: TableTarget, context: TableContext<Record, EncodedRecord, EncodedKey>): Store<Record> {
  const tableclient = connectTable(conf)

  return {
    put: async (record) => {
      let encodedRecord
      try {
        encodedRecord = await context.encodeRecord(record)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      const putCmd = new PutItemCommand({
        TableName: context.tableName,
        Item: marshall(encodedRecord, {
          removeUndefinedValues: true
        }),
      })

      try {
        await tableclient.send(putCmd)
      } catch (error: any) {
        return {
          error: new StoreOperationFailed(error.message)
        }
      }

      return {
        ok: {}
      }
    },
    get: async (key) => {
      let encodedKey
      try {
        encodedKey = await context.encodeKey(key)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      const getCmd = new GetItemCommand({
        TableName: context.tableName,
        Key: marshall(encodedKey)
      })

      let res
      try {
        res = await tableclient.send(getCmd)
      } catch (error: any) {
        return {
          error: new StoreOperationFailed(error.message)
        }
      }

      // not found error
      if (!res.Item) {
        return {
          error: new StoreNotFound('item not found in store')
        }
      }

      return {
        ok: await context.decodeRecord(
          // @ts-expect-error unmarshall has no types
          /** @type {Record} */ (unmarshall(res.Item))
        )
      }
    }
  }
}

export interface TableContext <Record, EncodedRecord, EncodedKey> {
  tableName: string
  encodeRecord: (record: Record) => EncodedRecord
  encodeKey: (record: Record) => EncodedKey
  decodeRecord: (record: EncodedRecord) => Record
}
