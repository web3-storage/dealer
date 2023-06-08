import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  TransactWriteItemsCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { CID } from 'multiformats/cid'
import type { Link } from '@ucanto/interface'
import * as AggregateAPI from '@web3-storage/aggregate-api'

// import { MAX_TRANSACT_WRITE_ITEMS } from './constants.js'

export function createArrangedOfferStore(region: string, tableName: string, options?: ArrangedOfferStoreDbOptions) {
  const dynamoDb = new DynamoDBClient({
    region,
    endpoint: options?.endpoint,
  })

  return useArrangedOfferStore(dynamoDb, tableName)
}

export function useArrangedOfferStore(dynamoDb: DynamoDBClient, tableName: string): ArrangedOfferStore {
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
        return unmarshall(response.Item).stat
      }
    },
    set: async (commitmentProof, stat) => {
      const cmd = new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({ commitmentProof: commitmentProof.toString() }),
        ExpressionAttributeValues: {
          ':st': { S: stat }
        },
        UpdateExpression: 'SET stat = :st'
      })

      await dynamoDb.send(cmd)
    },
    batchSet: async (arrangedOffers: ArrangedOffer[]) => {
      if (!arrangedOffers.length) {
        return
      }

      const cmd = new TransactWriteItemsCommand({
        TransactItems: arrangedOffers.map(ao => ({
          Update: {
            TableName: tableName,
            Key: marshall({ commitmentProof: ao.commitmentProof.toString() }),
            ExpressionAttributeValues: {
              ':st': { S: ao.stat }
            },
            UpdateExpression: 'SET stat = :st'
          }
        }))
      })

      await dynamoDb.send(cmd)
    },
    list: async function * (stat: STAT, options?: { limit: number }) {
      let exclusiveStartKey
      do {
        const queryCommand = new QueryCommand({
          TableName: tableName,
          Limit: options?.limit || 20,
          IndexName: 'indexStat',
          ExpressionAttributeValues: {
            ':st': { S: stat },
          },
          KeyConditionExpression: 'stat = :st'
        })

        const res = await dynamoDb.send(queryCommand)
        if (!res.Items || !res.Items.length) {
          break
        }

        exclusiveStartKey = res.LastEvaluatedKey
        for (const item of res.Items) {
          yield CID.parse(unmarshall(item).commitmentProof)
        }
      } while (exclusiveStartKey)
    }
  }
}

export interface ArrangedOfferStore extends AggregateAPI.ArrangedOfferStore {
  set: (commitmentProof: Link<unknown, number, number, 0 | 1>, stat: STAT) => Promise<void>
  batchSet: (arrangedOffer: ArrangedOffer[]) => Promise<void>
  list: (stat: STAT) => AsyncGenerator<CID, void>
}

export interface ArrangedOffer {
  commitmentProof: Link<unknown, number, number, 0 | 1>
  stat: STAT
}

export interface ArrangedOfferStoreDbOptions {
  endpoint?: string
}

export type STAT = 'queued' | 'accepted' | 'rejected'
