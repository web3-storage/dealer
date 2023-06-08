import * as AggregateAPI from '@web3-storage/aggregate-api'

import { randomCARs } from './utils.js'

/**
 * @param {number} length
 * @param {number} size
 */
export async function generateOffers(length, size) {
  return (await randomCARs(length, size))
    // Inflate size for testing within range
    .map((car) => ({
      ...car,
      size: car.size * 10e5,
    }))
}

/**
 * @returns {AggregateAPI.AggregateStore}
 */
export function createAggregateStore() {
  const aggregates = new Set()

  return {
    get: async (commitmentProof) => {
      if (aggregates.has(commitmentProof.toString())) {
        return Promise.resolve(['success'])
      }
      return Promise.resolve(undefined)
    },
    // @ts-expect-error not in interface
    set: async (commitmentProof) => {
      aggregates.add(commitmentProof.toString())

      return Promise.resolve()
    }
  }
}
