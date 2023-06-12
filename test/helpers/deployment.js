import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const sstPath = '../../.sst'

export function getStage () {
  let stage = process.env.SST_STAGE || process.env.SEED_APP_NAME
  if (stage) {
    return stage
  }

  const f = fs.readFileSync(path.join(
    process.cwd(),
    '.sst/stage'
  ))

  return f.toString()
}

export const getStackName = () => {
  const stage = getStage()
  return `${stage}-spade-proxy`
}

export const getApiEndpoint = () => {
  const stage = getStage()

  // CI/CD deployment
  if (process.env.SEED_APP_NAME) {
    return `https://${stage}.up.web3.storage`
  }

  const require = createRequire(import.meta.url)
  const testEnv = require(path.join(
    process.cwd(),
    '.sst/outputs.json'
  ))

  // Get Upload API endpoint
  const id = 'ApiStack'
  return testEnv[`${getStackName()}-${id}`].ApiEndpoint
}
