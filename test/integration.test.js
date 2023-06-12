import { fetch } from '@web-std/fetch'
import git from 'git-rev-sync'

import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'
import { Signer, Verifier} from '@ucanto/principal/ed25519'
import { Aggregate } from '@web3-storage/aggregate-client'

import { test } from './helpers/context.js'
import { getApiEndpoint, getStage } from './helpers/deployment.js'
import { randomCARs } from './helpers/random.js'

test.before(t => {
  t.context = {
    apiEndpoint: getApiEndpoint(),
  }
})

test('GET /version', async t => {
  const stage = getStage()
  const response = await fetch(`${t.context.apiEndpoint}/version`)
  t.is(response.status, 200)

  const body = await response.json()
  t.is(body.env, stage)
  t.is(body.commit, git.long('.'))
})

test('POST / for aggregate/offer', async t => {
  const { storeFront, DID } = await getContext()
  const connection = getServiceConnection({
    URL: t.context.apiEndpoint,
    DID
  })

  const offers = (await randomCARs(100, 100))
    // Inflate size for testing within range
    .map((car) => ({
      ...car,
      size: car.size * 10e5,
    }))

  const receipt = await Aggregate.aggregateOffer(
    {
      issuer: storeFront,
      with: storeFront.did(),
      audience: connection.id,
    },
    offers,
    { connection }
  )

  t.assert(receipt.ran.link())
  t.assert(receipt.out)
  t.deepEqual(receipt.out, {
    ok: {
      status: 'queued'
    }
  })
  t.assert(receipt.fx)

  // TODO: Check invocation in bucket
  // TODO: test to check receipt by tweaking cron job config for test?
})

async function getContext() {
  const storeFront = await Signer.generate()
  const DID = process.env.SPADE_PROXY_DID

  if (!DID) {
    throw new Error('SPADE_PROXY_DID env var not defined')
  }

  return { storeFront, DID }
}

/**
 * @param {{ DID: string, URL: string }} config 
 */
export function getServiceConnection(config) {
  const aggregationServicePrincipal = DID.parse(config.DID) // 'did:web:spade.web3.storage'
  const aggregationServiceURL = new URL(config.URL) // 'https://spade-proxy.web3.storage'

  const aggregationServiceConnection = connect({
    id: aggregationServicePrincipal,
    codec: CAR.outbound,
    channel: HTTP.open({
      url: aggregationServiceURL,
      method: 'POST',
    }),
  })

  return aggregationServiceConnection
}
