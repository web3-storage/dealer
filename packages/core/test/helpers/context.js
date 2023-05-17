import anyTest from 'ava'

/**
 * @typedef {object} S3Context
 * @property {import('@aws-sdk/client-s3').S3Client} s3
 * @property {import('@aws-sdk/client-dynamodb').DynamoDBClient} dynamo
 * 
 * @typedef {import("ava").TestFn<S3Context>} Test
 */

// eslint-disable-next-line unicorn/prefer-export-from
export const test = /** @type {Test} */ (anyTest)
