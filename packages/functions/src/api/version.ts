export async function handler() {
  const {
    NAME: name,
    VERSION: version,
    COMMIT: commit,
    STAGE: env,
  } = process.env
  return {
    statusCode: 200,
    headers: {
      'Content-Type': `application/json`,
    },
    body: JSON.stringify({ name, version, commit, env }),
  };
}