import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { ConnectionView } from '@ucanto/principal/ed25519'
import { Chain } from '@web3-storage/filecoin-client'
import { InvocationConfig } from '@web3-storage/filecoin-client/types'

import { Status, Deal, decode as decodeDeal } from '../data/deal.js'
import { DatabaseOperationFailed } from '../errors.js'

/**
 * Track filecoin deals Job.
 * Find `OFFERED` deals pending approval and find out if these deals are on chain.
 * If `OFFERED` deals are now on chain, update them to `APPROVED`.
 */
export async function dealTrack ({
  tableName,
  tableClient,
  dealTrackerServiceConnection,
  dealTrackerInvocationConfig
}: DealTrackContext) {
  // Get offered deals pending approval/rejection
  const offeredDeals = await getOfferedDeals({ tableName, tableClient })
  if (offeredDeals.error) {
    return offeredDeals
  }

  // Update approved deals from the ones resolved
  const updatedResponses = await Promise.all(
    offeredDeals.ok.map(deal => updateApprovedDeals({
      deal,
      tableName,
      tableClient,
      dealTrackerServiceConnection,
      dealTrackerInvocationConfig
    }))
  )

  // Fail if one or more update operations did not succeed.
  // The successful ones are still valid, but we should keep track of errors for monitoring/alerting.
  const updateErrorResponse = updatedResponses.find(r => r.error)
  if (updateErrorResponse) {
    return {
      error: updateErrorResponse.error
    }
  }

  // Return successful update operation
  // Include in response the ones that were Updated, and the ones still pending response.
  // TODO: this response body can probably be used to flag deals that we are waiting for response for too late if we add details.
  const updatedDealsCount = updatedResponses.filter(r => r.ok?.updated).length
  return {
    ok: {
      updatedCount: updatedDealsCount,
      pendingCount: updatedResponses.length - updatedDealsCount
    },
    error: undefined
  }
}

/**
 * Find out if deal is on chain.
 * When on chain, updates its stat in store.
 */
async function updateApprovedDeals ({
  deal,
  dealTrackerServiceConnection,
  dealTrackerInvocationConfig,
  tableName,
  tableClient,
}: DealTrackContext & { deal: Deal }) {
  // Query current state
  const info = await Chain.chainInfo(
    dealTrackerInvocationConfig,
    deal.aggregate,
    { connection: dealTrackerServiceConnection }
  )

  if (info.out.error) {
    return info.out
  }

  // If there are no deals for it, we can skip
  // @ts-expect-error deals not yet typed
  if (!Object.keys(info.out.ok.deals || {}).length) {
    return {
      ok: {
        updated: false
      }
    }
  }

  // Update entry with stat `Status.Approved`
  const updateRes = await tableClient.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({
        aggregate: deal.aggregate.link().toString()
      }),
      ExpressionAttributeValues: {
        ':ns': { N: `${Status.Approved}` }
      },
      UpdateExpression: `SET stat = :ns`,
      ReturnValues: 'ALL_NEW',
    })
  )

  if (updateRes.$metadata.httpStatusCode !== 200) {
    return {
      error: new DatabaseOperationFailed(`failed to update status of aggregate ${deal.aggregate.link().toString()}`)
    }
  }

  return {
    ok: {
      updated: true
    }
  }
}

/**
 * Query deals table to get deals that are currently in `Offered` state.
 */
async function getOfferedDeals ({
  tableName,
  tableClient
}: DealTable) {
  // TODO: Pagination
  // A single Query only returns a result set that fits within the 1 MB size limit.
  // This should be enough for our throughput here, specially if we sort by insertion date.
  const cmd = new QueryCommand({
    TableName: tableName,
    KeyConditions: {
      stat: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ N: `${Status.Offered}` }]
      }
    },
    // Index on `stat` column
    IndexName: 'indexStat',
  })

  const resp = await tableClient.send(cmd)
  if (resp.$metadata.httpStatusCode !== 200) {
    return {
      error: new DatabaseOperationFailed(`failed to query available aggregates with stat ${Status.Offered}`)
    }
  }

  return {
    ok: (resp?.Items && resp?.Items.map(i => 
      // @ts-expect-error unmarshall not typed
      decodeDeal.record((unmarshall(i))))
    ) || []
  }
}

export interface DealTrackContext extends DealTable {
  dealTrackerServiceConnection: ConnectionView<any>
  dealTrackerInvocationConfig: InvocationConfig
}

export interface DealTable {
  tableName: string
  tableClient: DynamoDBClient
}
