import { HTTPRequest } from '@ucanto/interface'
import fetch from 'node-fetch'
import pRetry from 'p-retry'

export const connect = (input: { url: URL, auth?: string }) => new UCANLog(input)

class UCANLog {
  url: URL
  auth?: string

  constructor({ url, auth }: { url: URL, auth?: string }) {
    this.url = url
    this.auth = auth
  }

  async log(request: HTTPRequest) {
    try {
      await pRetry(
        async () => {
          const res = await fetch(`${this.url}`, {
            method: 'POST',
            headers: {
              ...request.headers,
              Authorization: `Basic ${this.auth}`,
            },
            body: request.body,
          })

          if (!res.ok) {
            const reason = await res.text().catch(() => '')
            throw new Error(`HTTP post failed: ${res.status} - ${reason}`)
          }
        },
        {
          retries: 3,
        }
      )
    } catch (error) {
      throw new Error(`Failed to log agent message: ${error}`, { cause: error })
    }
  }
}
