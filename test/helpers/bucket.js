import { GetObjectCommand } from '@aws-sdk/client-s3'
import pRetry from 'p-retry'

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucketName
 * @param {string} key
 */
export async function pollBucketItem (client, bucketName, key) {
  const cmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  })

  const response = await pRetry(async () => {
    let r
    try {
      r = await client.send(cmd)
    } catch (err) {
      if (err?.$metadata?.httpStatusCode === 404) {
        throw new Error('not found')
      }
    }

    return r
  }, {
    retries: 100,
    maxTimeout: 1000,
    minTimeout: 1000
  })
  
  return await response?.Body?.transformToByteArray()
}
