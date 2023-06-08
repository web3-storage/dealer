export function mustGetEnv (name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name} environment variable`)
  return value
}
