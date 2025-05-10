// Route pour initier l'authentification Discord
router.get('/auth', authenticateToken, (req, res) => {
  // Récupérer l'adresse du wallet depuis le token JWT
  const walletAddress = req.user.address || req.user.walletAddress;
  
  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      message: 'Vous devez être connecté avec un wallet pour lier votre compte Discord'
    });
  }
  
  // Créer l'URL d'authentification Discord
  const state = Buffer.from(JSON.stringify({ walletAddress })).toString('base64');
  
  // Inclure le scope guilds.join pour permettre l'ajout automatique au serveur
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join&state=${state}`;
  
  res.json({
    success: true,
    authUrl: discordAuthUrl
  });
});

// Route pour compléter la liaison Discord depuis le frontend
router.post('/complete-link', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour lier votre compte Discord'
      });
    }
    
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code d\'autorisation Discord manquant'
      });
    }
    
    console.log(`Tentative de liaison Discord pour le wallet ${walletAddress} avec le code ${code.substring(0, 10)}...`);
    
    // Vérifier que les variables d'environnement Discord sont définies
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      console.error('Variables d\'environnement Discord manquantes:', { 
        DISCORD_CLIENT_ID: !!DISCORD_CLIENT_ID, 
        DISCORD_CLIENT_SECRET: !!DISCORD_CLIENT_SECRET 
      });
      return res.status(500).json({
        success: false,
        message: 'Configuration Discord manquante sur le serveur'
      });
    }

    // Échanger le code contre un token d'accès Discord
    try {
      const tokenResponse = await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI
        })
      });
      
      // Vérifier si la réponse est OK
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Erreur lors de l\'obtention du token Discord:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText
        });
        return res.status(500).json({
          success: false,
          message: `Erreur lors de l'échange du code: ${tokenResponse.status} ${tokenResponse.statusText}`
        });
      }
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error('Erreur lors de l\'échange du code:', tokenData);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'échange du code d\'autorisation'
        });
      }
      
      // Récupérer les informations de l'utilisateur Discord
      const userResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      
      // Vérifier si la réponse est OK
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('Erreur lors de la récupération des infos utilisateur:', {
          status: userResponse.status,
          statusText: userResponse.statusText,
          error: errorText
        });
        return res.status(500).json({
          success: false,
          message: `Erreur lors de la récupération des infos utilisateur: ${userResponse.status}`
        });
      }
      
      const userData = await userResponse.json();
      
      if (!userData.id) {
        console.error('Erreur lors de la récupération des informations de l\'utilisateur:', userData);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des informations de l\'utilisateur Discord'
        });
      }
      
      // Supprimer les liens existants pour éviter les duplications
      await DiscordLink.deleteMany({ $or: [{ discordId: userData.id }, { walletAddress }] });
      
      // Compter le nombre total d'utilisateurs pour déterminer l'ordre d'inscription
      const totalUsers = await DiscordLink.countDocuments();
      
      // Créer un nouveau document Discord Link
      const discordLink = new DiscordLink({
        walletAddress,
        discordId: userData.id,
        discordUsername: userData.username,
        discordAvatar: userData.avatar,
        registrationOrder: totalUsers + 1,
        notifyDailyClaims: true,
        roles: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await discordLink.save();
      console.log(`Lien Discord créé avec succès pour ${userData.username} (${userData.id}) avec le wallet ${walletAddress}`);
      
      // Ajouter l'utilisateur au serveur Discord s'il n'en est pas déjà membre
      console.log(`Tentative d'ajout de l'utilisateur ${maskDiscordId(userData.id)} au serveur Discord`);
      const addedToGuild = await addUserToGuild(userData.id, tokenData.access_token);
      if (addedToGuild) {
        console.log(`Utilisateur ${maskDiscordId(userData.id)} ajouté au serveur Discord avec succès`);
        
        // Attendre que Discord synchronise l'ajout du membre (2 secondes)
        console.log(`Attente de 2 secondes pour la synchronisation Discord...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.warn(`Impossible d'ajouter l'utilisateur ${maskDiscordId(userData.id)} au serveur Discord`);
      }
      
      // Vérifier si l'utilisateur est parmi les 5000 premiers pour le rôle Early Contributor
      let isEarlyContributor = false;
      if (discordLink.registrationOrder <= 5000) {
        console.log(`L'utilisateur ${userData.username} est parmi les 5000 premiers (position: ${discordLink.registrationOrder})`);
        // Attribuer le rôle "Early Contributor"
        const roleAssigned = await assignRoleToUser(userData.id, "Early Contributor");
        
        if (roleAssigned) {
          console.log(`Rôle Early Contributor attribué à ${userData.username}`);
          // Ajouter le rôle à la liste des rôles de l'utilisateur
          discordLink.roles.push("Early Contributor");
          await discordLink.save();
          isEarlyContributor = true;
          
          // Envoyer un message privé à l'utilisateur
          await sendDirectMessageToUser(userData.id, `🌟 **Congratulations!** As one of our first 5,000 users, you've been granted the **Early Contributor** role in our Discord server. Thank you for your early support of our decentralized VPN network!`);
        }
      }
      
      // Envoyer un message dans le canal Discord
      await sendMessageToDiscordChannel(`🔗 Le wallet \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\` a lié son compte Discord \`${userData.username}\` (ID: ${userData.id.slice(0, 3)}***${userData.id.slice(-2)})`);

      
      return res.json({
        success: true,
        message: 'Compte Discord lié avec succès',
        isEarlyContributor
      });
      
    } catch (error) {
      console.error('Erreur lors de la liaison Discord:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la liaison Discord: ' + (error.message || 'Erreur inconnue')
      });
    }
  } catch (error) {
    console.error('Erreur générale lors de la liaison Discord:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la liaison Discord'
    });
  }
});
