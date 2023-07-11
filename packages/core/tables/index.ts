import { TableProps } from 'sst/constructs'

export const arrangedOfferTableProps = {
  fields: {
    link: 'string', // `bafcommp...1`
    stat: 'string',          // `queued`
  },
  // name must be unique to satisfy index constraint
  primaryIndex: { partitionKey: 'link' },
  globalIndexes: {
    indexStat: {
      partitionKey: 'stat',
      sortKey: 'link',
      projection: 'keys_only'
    }
  }
} as TableProps
