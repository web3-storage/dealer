import { TableProps } from 'sst/constructs'

export const arrangedOfferTableProps = {
  fields: {
    commitmentProof: 'string', // `bafcommp...1`
    stat: 'string',          // `queued`
  },
  // name must be unique to satisfy index constraint
  primaryIndex: { partitionKey: 'commitmentProof' },
  globalIndexes: {
    indexStat: {
      partitionKey: 'stat',
      sortKey: 'commitmentProof',
      projection: 'keys_only'
    }
  }
} as TableProps
