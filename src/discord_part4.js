// Route pour vérifier le statut de liaison Discord (avec authentification)
router.get('/link-status', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    // Vérifier toutes les liaisons existantes pour ce wallet
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.json({
        linked: false,
        discordUsername: null,
        discordAvatar: null,
        discordId: null,
        notifyDailyClaims: false,
        isEarlyContributor: false,
        registrationOrder: null
      });
    }
    
    // Déterminer si l'utilisateur est un early contributor (parmi les 5000 premiers)
    const isEarlyContributor = discordLink.registrationOrder <= 5000;
    
    res.json({
      linked: true,
      discordUsername: discordLink.discordUsername,
      discordAvatar: discordLink.discordAvatar,
      discordId: discordLink.discordId,
      notifyDailyClaims: discordLink.notifyDailyClaims !== undefined ? discordLink.notifyDailyClaims : true,
      isEarlyContributor,
      registrationOrder: discordLink.registrationOrder
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut Discord'
    });
  }
});

// Route pour supprimer le lien entre un wallet et un compte Discord
router.delete('/link', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet'
      });
    }
    
    const discordUsername = discordLink.discordUsername;
    
    await DiscordLink.deleteOne({ walletAddress });
    
    // Envoyer un message dans le canal Discord
    await sendMessageToDiscordChannel(`❌ Le wallet \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\` a supprimé son lien avec le compte Discord \`${discordUsername}\``);

    
    res.json({
      success: true,
      message: 'Lien Discord supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du lien Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du lien Discord'
    });
  }
});

// Route pour activer/désactiver les notifications de daily claims
router.post('/notifications/daily-claims', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre "enabled" est requis'
      });
    }
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet'
      });
    }
    
    // Mettre à jour les préférences de notification
    discordLink.notifyDailyClaims = enabled;
    await discordLink.save();
    
    // Envoyer un message privé à l'utilisateur pour confirmer
    if (enabled) {
      await sendDirectMessageToUser(discordLink.discordId, `📢 You have **enabled** daily claim notifications. You will now receive a private message when your daily rewards are available to claim.`);
    } else {
      await sendDirectMessageToUser(discordLink.discordId, `🔕 You have **disabled** daily claim notifications. You will no longer receive private messages about daily claims.`);
    }
    
    res.json({
      success: true,
      message: enabled ? 'Notifications de daily claims activées' : 'Notifications de daily claims désactivées',
      notifyDailyClaims: enabled
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences de notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des préférences de notification'
    });
  }
});

// Route pour vérifier si l'utilisateur est parmi les 5000 premiers
router.get('/early-contributor', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet',
        isEarlyContributor: false
      });
    }
    
    const isEarlyContributor = discordLink.registrationOrder <= 5000;
    
    res.json({
      success: true,
      isEarlyContributor,
      registrationOrder: discordLink.registrationOrder,
      roles: discordLink.roles || []
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de contributeur précoce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut de contributeur précoce'
    });
  }
});

export default router;
