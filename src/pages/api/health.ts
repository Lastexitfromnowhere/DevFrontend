import type { NextApiRequest, NextApiResponse } from 'next'
import { config } from '@/config/env'
import axios from 'axios'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400') 
    res.status(200).end()
    return
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
    return
  }
  try {
    console.log('Checking backend health...');
    const response = await axios.get(`${config.API_BASE_URL}/health`, {
      timeout: 5000 
    });
    console.log('Backend health response:', response.data);
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    const healthData = response.data as { status?: string };
    if (healthData.status === 'healthy') {
      res.status(200).json({ status: 'healthy' })
    } else {
      res.status(503).json({ status: 'unhealthy' })
    }
  } catch (error: any) {
    console.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: 'Backend service unavailable'
    })
  }
}
