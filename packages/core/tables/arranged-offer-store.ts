import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  // QueryCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import type { Link } from '@ucanto/interface'
import * as AggregateAPI from '@web3-storage/aggregate-api'

export function createArrangedOfferStore(region: string, tableName: string, options?: ArrangedOfferStoreDbOptions) {
  const dynamoDb = new DynamoDBClient({
    region,
    endpoint: options?.endpoint,
  })

  return useArrangedOfferStore(dynamoDb, tableName)
}

export function useArrangedOfferStore(dynamoDb: DynamoDBClient, tableName: string) {
  return {
    get: async (commitmentProof) => {
      const cmd = new GetItemCommand({
        TableName: tableName,
        Key: marshall({
          commitmentProof: commitmentProof.toString()
        })
      })

      const response = await dynamoDb.send(cmd)
      if (response?.Item) {
        return unmarshall(response.Item)
      }
    },
    set: async (commitmentProof, stat) => {
      const item = {
        commitmentProof: commitmentProof.toString(),
        stat
      }

      const cmd = new PutItemCommand({
        TableName: tableName,
        Item: marshall(item),
      })

      await dynamoDb.send(cmd)
    }
  } as ArrangedOfferStore
}

export interface ArrangedOfferStore extends AggregateAPI.ArrangedOfferStore {
  set: (commitmentProof: Link<unknown, number, number, 0 | 1>, status: string) => Promise<void>
}

export interface ArrangedOfferStoreDbOptions {
  endpoint?: string
}
