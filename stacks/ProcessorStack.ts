import {
  Queue,
  StackContext,
  use
} from 'sst/constructs';

import { DataStack } from './DataStack';
import {
  getResourceName,
  setupSentry
} from './config';

export function ProcessorStack({ app, stack }: StackContext) {
  // Setup app monitoring with Sentry
  setupSentry(app, stack)

  const { dealTable } = use(DataStack)

  /**
   * processor queue - dealer workflow
   */
  const dealerQueueName = getResourceName('dealer-queue', stack.stage)
  const dealerQueue = new Queue(stack, dealerQueueName, {
    cdk: {
      queue: {
        // Guarantee exactly-once processing
        // (Note: maximum 10 batch)
        fifo: true,
        // During the deduplication interval (5 minutes), Amazon SQS treats
        // messages that are sent with identical body content
        contentBasedDeduplication: true,
        queueName: `${dealerQueueName}.fifo`,
      }
    }
  })

  /**
   * Handle queued deals to be offered to SPs
   */
  dealerQueue.addConsumer(stack, {
    function: {
      handler: 'packages/functions/src/processor/dealer-store.workflow',
      bind: [
        dealTable
      ],
      environment: {}
    },
    cdk: {
      eventSource: {
        // as soon as we have one, we should add it to the dealer
        batchSize: 1
      },
    },
  })

  return {
    dealerQueue
  }
}
