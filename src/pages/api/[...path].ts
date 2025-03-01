import type { NextApiRequest, NextApiResponse } from 'next'
import { config } from '@/config/env'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query
  const apiPath = Array.isArray(path) ? path.join('/') : path
  const targetUrl = `${config.API_BASE_URL}/${apiPath}`

  try {
    console.log(`Forwarding request to: ${targetUrl}`)
    console.log('Headers:', req.headers)
    console.log('Method:', req.method)
    console.log('Body:', req.body)

    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    }

    // Forward authentication headers
    if (req.headers['x-wallet-address']) {
      headers['X-Wallet-Address'] = req.headers['x-wallet-address'] as string
    }
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization
    }

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers,
      validateStatus: () => true // Don't throw on any status
    })

    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    })

    // Forward the response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) res.setHeader(key, value)
    })

    res.status(response.status).json(response.data)
  } catch (error: any) {
    console.error('API Error:', error)
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    })
  }
}
