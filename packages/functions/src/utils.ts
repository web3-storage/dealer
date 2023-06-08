export function mustGetEnv (name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name} environment variable`)
  return value
}

export function parseDynamoDbEvent (event: import('aws-lambda').DynamoDBStreamEvent) {
  return event.Records.map(r => ({
    new: r.dynamodb?.NewImage,
    old: r.dynamodb?.OldImage
  }))
}
