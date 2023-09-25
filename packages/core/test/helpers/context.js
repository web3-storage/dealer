import anyTest from 'ava'

/**
 * @typedef {object} S3Context
 * @property {import('@aws-sdk/client-s3').S3Client} s3
 * 
 * @typedef {object} DbContext
 * @property {import('@aws-sdk/client-dynamodb').DynamoDBClient} dynamoClient
 * @property {string} dynamoEndpoint
 * 
 * @typedef {object} QueueContext
 * @property {import('@aws-sdk/client-sqs').SQSClient} sqsClient
 * @property {string} queueName
 * @property {string} queueUrl
 * @property {import('sqs-consumer').Consumer} queueConsumer
 * @property {import('@aws-sdk/client-sqs').Message[]} queuedMessages
 * 
 * @typedef {import("ava").TestFn<any>} Test
 * @typedef {import("ava").TestFn<S3Context & DbContext & QueueContext>} TestService
 * @typedef {import("ava").TestFn<S3Context & DbContext>} TestWorkflow
 */

// eslint-disable-next-line unicorn/prefer-export-from
export const test = /** @type {Test} */ (anyTest)

// eslint-disable-next-line unicorn/prefer-export-from
export const testService = /** @type {TestService} */ (anyTest)

// eslint-disable-next-line unicorn/prefer-export-from
export const testWorkflow = /** @type {TestWorkflow} */ (anyTest)
