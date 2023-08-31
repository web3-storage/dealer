import { SQSClient } from '@aws-sdk/client-sqs'

export interface QueueConnect {
  region: string
}

export type Target = SQSClient | QueueConnect

export function connectQueue (target: Target) {
  if (target instanceof SQSClient) {
    return target
  }
  return new SQSClient(target)
}
