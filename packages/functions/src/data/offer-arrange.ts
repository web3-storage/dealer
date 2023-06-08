import * as Sentry from '@sentry/serverless'
import { Config } from 'sst/node/config'

import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'
import { CID } from 'multiformats/cid'
import { unmarshall } from '@aws-sdk/util-dynamodb'

import { offerArrange } from '@spade-proxy/core/arrange-offers'
import { getServiceSigner } from '@spade-proxy/core/service'

import { mustGetEnv, parseDynamoDbEvent } from '../utils'

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})

export async function main(event: import('aws-lambda').DynamoDBStreamEvent) {
  const {
    spadeProxyDid,
    spadeProxyUrl
  } = getLambdaEnv()

  const records = parseDynamoDbEvent(event)
  if (records.length > 1) {
    throw new Error('Should only receive one offer to arrange')
  }

  // @ts-expect-error can't figure out type of new
  const newRecord = unmarshall(records[0].new)

  const { PRIVATE_KEY } = Config

  const serviceSigner = getServiceSigner({ SPADE_PROXY_DID: spadeProxyDid, PRIVATE_KEY })
  const serviceConnection = getServiceConnection({
    DID: spadeProxyDid,
    URL: spadeProxyUrl
  })

  // Create message with receipt from offer arrange
  /** @type {import('@spade-proxy/core/tables/arranged-offer-store').ArrangedOffer} */
  const offer = {
    commitmentProof: CID.parse(newRecord.commitmentProof),
    stat: newRecord.stat
  }
  await offerArrange(offer, serviceSigner, serviceConnection)
}

function getLambdaEnv () {
  return {
    spadeProxyDid: mustGetEnv('SPADE_PROXY_DID'),
    spadeProxyUrl: mustGetEnv('SPADE_PROXY_URL')
  }
}

export function getServiceConnection(config: { DID: string, URL: string}) {
  const aggregationServicePrincipal = DID.parse(config.DID) // 'did:web:spade.web3.storage'
  const aggregationServiceURL = new URL(config.URL) // 'https://spade-proxy.web3.storage'

  const aggregationServiceConnection = connect({
    id: aggregationServicePrincipal,
    codec: CAR.outbound,
    // @ts-expect-error
    channel: HTTP.open({
      url: aggregationServiceURL,
      method: 'POST',
    }),
  })

  return aggregationServiceConnection
}
