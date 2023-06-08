import all from 'it-all'

import { OfferStore } from './buckets/offer-store'

export async function mergeOffers (date: Date, offerStore: OfferStore) {
  const d = getPreviousUtcDateName(date)
  const offers = (await all(offerStore.list(d)))
  await offerStore.putMergedOffers(d, offers)

  return d
}

function getPreviousUtcDateName(date: Date) {
  // normalize date to multiple of 15 minutes
  const currentMinute = date.getUTCMinutes()
  const factor = Math.floor(currentMinute / 15) // difference between previous and next
  const additionalTime = ((factor * 15) - currentMinute) * 60000

  const nDate = new Date(date.getTime() + additionalTime)
  
  return `${nDate.getUTCFullYear()}-${nDate.getUTCMonth()}-${nDate.getUTCDay()} ${nDate.getUTCHours()}:${nDate.getUTCMinutes()}:00`
}
