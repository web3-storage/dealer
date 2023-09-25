import * as Signer from '@ucanto/principal/ed25519'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as FilecoinCapabilities from '@web3-storage/capabilities/filecoin'

import { OperationFailed } from './errors.js'
import { mockService } from './mocks.js'

const nop = (/** @type {any} */ invCap) => {}

/**
 * @typedef {object} Deal
 * @property {string} provider
 *
 * @typedef {Record<String, Deal>} DealInfo
 * @typedef {object} DealInfoSuccess
 * @property {DealInfo} deals
 */

/**
 * @param {any} serviceProvider
 * @param {Map<string, DealInfoSuccess | undefined>} dealStore
 * @param {object} [options]
 * @param {(inCap: any) => void} [options.onCall]
 * @param {boolean} [options.mustFail]
 */
export async function getDealTrackerServiceServer (serviceProvider, dealStore, options = {}) {
  const onCall = options.onCall || nop

  const service = mockService({
    'chain-tracker': {
      info: Server.provide(FilecoinCapabilities.chainTrackerInfo, async ({ invocation }) => {
        const invCap = invocation.capabilities[0]

        if (!invCap.nb) {
          throw new Error('no nb field received in invocation')
        }

        if (options.mustFail) {
          return {
            error: new OperationFailed(
              'failed to add to aggregate',
              // @ts-ignore wrong dep
              invCap.nb.aggregate
            )
          }
        }

        onCall(invCap)

        return {
          ok: dealStore.get(invCap.nb.piece.toString()) || { deals: {} }
        }
      }),
    }
  })

  const server = Server.create({
    id: serviceProvider,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: serviceProvider,
    codec: CAR.outbound,
    channel: server,
  })

  return {
    service,
    connection
  }
}

export async function getDealTrackerCtx () {
  const dealer = await Signer.generate()
  const dealTracker = await Signer.generate()
  
  return {
    dealer: {
      did: dealer.did(),
      privateKey: Signer.format(dealer),
      raw: dealer
    },
    dealTracker: {
      did: dealTracker.did(),
      privateKey: Signer.format(dealTracker),
      raw: dealTracker
    }
  }
}

/**
 * @param {any} serviceProvider
 * @param {object} [options]
 * @param {(inCap: any) => void} [options.onCall]
 * @param {boolean} [options.mustFail]
 */
export async function getDealerServiceServer (serviceProvider, options = {}) {
  const onCall = options.onCall || nop

  const service = mockService({
    deal: {
      add: Server.provide(FilecoinCapabilities.dealAdd, async ({ invocation }) => {
        const invCap = invocation.capabilities[0]

        if (!invCap.nb) {
          throw new Error('no nb field received in invocation')
        }
        if (options.mustFail) {
          return {
            error: new OperationFailed(
              'failed to add to deal',
              invCap.nb.aggregate
            )
          }
        }

        onCall(invCap)

        /** @type {import('@web3-storage/capabilities/types').DealAddSuccess} */
        const dealAddResponse = {
          aggregate: invCap.nb.aggregate,
        }

        return {
          ok: dealAddResponse
        }
      }),
      queue: () => {
        throw new Error('not implemented')
      },
    },
  })

  const server = Server.create({
    id: serviceProvider,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: serviceProvider,
    codec: CAR.outbound,
    channel: server,
  })

  return {
    service,
    connection
  }
}

export async function getDealerCtx () {
  const dealer = await Signer.generate()
  
  return {
    dealer: {
      did: dealer.did(),
      privateKey: Signer.format(dealer),
      raw: dealer
    }
  }
}
