import { GetItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import pRetry from 'p-retry'

/**
 * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} dynamo
 * @param {string} tableName
 * @param {object} key
 */
export async function pollTableItem (dynamo, tableName, key) {
  const cmd = new GetItemCommand({
    TableName: tableName,
    Key: marshall(key)
  })

  const response = await pRetry(async () => {
    const r = await dynamo.send(cmd)
    if (r.$metadata.httpStatusCode === 404) {
      throw new Error('not found in dynamoDB yet')
    }
    return r
  }, {
    maxTimeout: 1500,
    minTimeout: 1000,
    retries: 100
  })

  return response.Item && unmarshall(response.Item)
}
