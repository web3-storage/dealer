import * as AggregateAPI from '@web3-storage/aggregate-api'

export function createAggregateStore() {
  return useAggregateStore()
}

export function useAggregateStore() {
  return {
    get: async (pieceLink) => {
      throw new Error('not yet implemented')
    }
  } as AggregateAPI.AggregateStore
}
