import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { QueueOperationFailed, EncodeRecordFailed } from '@web3-storage/filecoin-api/errors'
import { Queue, Store } from '@web3-storage/filecoin-api/types'

import { connectQueue, Target } from './index.js'

const IMPLICIT_MESSAGE_GROUP_ID = '1'

export function createQueueClient <Record> (conf: Target, context: QueueContext<Record>): Queue<Record> {
  const queueClient = connectQueue(conf)
  return {
    add: async (record, options = {}) => {
      let encodedKey: string
      try {
        encodedKey = context.encodeKey(record)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      let encodedMessage: string
      try {
        encodedMessage = await context.encodeMessage(record, encodedKey)
      } catch (error: any) {
        return {
          error: new EncodeRecordFailed(error.message)
        }
      }

      const { error } = await context.store.put(record)
      if (error) {
        return { error }
      }

      let messageGroupId = options.messageGroupId || IMPLICIT_MESSAGE_GROUP_ID
      const cmd = new SendMessageCommand({
        QueueUrl: context.queueUrl,
        MessageBody: encodedMessage,
        // If SQS Client was provided, we are in testing mode, and we cannot provide message group ID
        // given resource used does not support FIFO Queues with it.
        MessageGroupId: conf instanceof SQSClient ? undefined : messageGroupId
      })

      let r
      try {
        r = await queueClient.send(cmd)
        if (r.$metadata.httpStatusCode !== 200) {
          throw new Error(`failed sending message to queue with code ${r.$metadata.httpStatusCode}`)
        }
      } catch (error: any) {
        return {
          error: new QueueOperationFailed(error.message)
        }
      }

      return {
        ok: {}
      }
    }
  }
}

export interface QueueContext <Record> {
  queueUrl: string
  store: Store<Record>
  encodeKey: (record: Record) => string
  encodeMessage: (record: Record, key: string) => string
}
