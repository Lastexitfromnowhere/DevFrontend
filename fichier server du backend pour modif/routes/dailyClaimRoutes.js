import express from 'express';
import { 
  getDailyClaimStatus, 
  processDailyClaim,
  adjustRewards,
  getTransactionHistory
} from '../controllers/dailyClaimController.js';

const router = express.Router();

const getWalletAddress = (req) => {
  return req.headers['x-wallet-address'] || 
         req.query.walletAddress || 
         req.body.walletAddress ||
         (req.user && req.user.walletAddress);
};

// Route publique pour vérifier l'état
router.get('/status', async (req, res) => {
  try {
    const walletAddress = getWalletAddress(req);
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }
    
    const result = await getDailyClaimStatus(walletAddress);
    res.json(result);
  } catch (error) {
    console.error('Error in daily claim status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

// Route pour réclamer la récompense quotidienne
router.post('/claim', async (req, res) => {
  try {
    const walletAddress = getWalletAddress(req);
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }
    
    const result = await processDailyClaim(walletAddress, req.user?.id || 'system');
    res.json(result);
  } catch (error) {
    console.error('Error claiming daily reward:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to process claim' 
    });
  }
});

// Route admin pour ajuster les récompenses
router.post('/admin/adjust', async (req, res) => {
  try {
    const { walletAddress, amount, notes } = req.body;
    
    if (!walletAddress || amount === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address and amount are required' 
      });
    }
    
    const result = await adjustRewards(
      walletAddress, 
      parseFloat(amount), 
      notes,
      req.user?.id || 'admin'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error adjusting rewards:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to adjust rewards' 
    });
  }
});

// Route pour obtenir l'historique des transactions
router.get('/history', async (req, res) => {
  try {
    const walletAddress = getWalletAddress(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }
    
    const result = await getTransactionHistory(walletAddress, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch transaction history' 
    });
  }
});

export default router;
