import type { NextApiRequest, NextApiResponse } from 'next'
import { config } from '@/config/env'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'X-Wallet-Address, Content-Type, Authorization')
    res.setHeader('Access-Control-Max-Age', '86400') // 24 heures
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
    return
  }

  try {
    const response = await axios.get(`${config.API_BASE_URL}/api/networkStats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Ajouter les headers CORS à la réponse
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'X-Wallet-Address, Content-Type, Authorization')

    res.status(200).json(response.data)
  } catch (error: any) {
    console.error('Failed to fetch network stats:', error)
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch network stats',
      details: error.response?.data || error.message
    })
  }
}
