import * as AggregateAPI from '@web3-storage/aggregate-api'

export function createAggregateStore() {
  return useAggregateStore()
}

export function useAggregateStore() {
  return {
    get: async (commitmentProof) => {
      throw new Error('not yet implemented')
    }
  } as AggregateAPI.AggregateStore
}
