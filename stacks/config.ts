import { RemovalPolicy } from 'aws-cdk-lib'
import git from 'git-rev-sync'
import * as pack from '../package.json'

/**
 * Get nicer bucket names
 */
export function getBucketName (name: string, stage: string, version = 0) {
  // e.g `carpark-prod-0` or `satnav-pr101-0`
  return `${name}-${stage}-${version}`
}

export function getBucketConfig(name: string, stage: string, version = 0){
  return {
    bucketName: getBucketName(name, stage, version),
    ...(isPrBuild(stage) && {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    })
  }
}

/**
 * Is an ephemeral build?
 */
export function isPrBuild (stage: string) {
  if (!stage) throw new Error('stage must be provided')
  return stage !== 'prod' && stage !== 'staging'
}

/**
 * Return the custom domain config for http api.
 */
export function getCustomDomain (stage: string, hostedZone?: string) {
  // return no custom domain config if hostedZone not set
  if (!hostedZone) {
    return 
  }
  const domainMap: Record<string,string> = { prod: hostedZone }
  const domainName = domainMap[stage] ?? `${stage}.${hostedZone}`
  return { domainName, hostedZone }
}

export function getApiPackageJson () {
  return pack
}

export function getGitInfo () {
  return {
    commmit: git.long('.'),
    branch: git.branch('.')
  }
}

export function setupSentry (app: import('sst/constructs').App, stack: import('sst/constructs').Stack) {
  // Skip when locally
  if (app.local) {
    return
  }

  const { SENTRY_DSN } = getEnv()

  stack.addDefaultFunctionEnv({
    SENTRY_DSN,
  })
}

/**
 * Get Env validating it is set.
 */
 function getEnv() {
  return {
    SENTRY_DSN: mustGetEnv('SENTRY_DSN'),
  }
}

function mustGetEnv (name: string) {
  const data = process.env[name]
  if (!data) {
    throw new Error(`Missing env var: ${name}`)
  }

  return data
}
