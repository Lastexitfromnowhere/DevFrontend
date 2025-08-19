// routes/authGoogle.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = express.Router();

// Route pour vérifier l'authentification Google
router.get('/check', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.json({ authenticated: false });
    }
    
    // Vérifier si l'utilisateur a un googleId
    res.json({ authenticated: !!user.googleId });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification Google:', error);
    res.json({ authenticated: false });
  }
});

// Route pour démarrer l'authentification Google
router.get('/google', (req, res, next) => {
  const { redirect } = req.query;
  const state = redirect ? Buffer.from(JSON.stringify({ redirect })).toString('base64') : undefined;
  
  const authOptions = {
    scope: ['profile', 'email'],
    session: false,
    state: state
  };
  
  passport.authenticate('google', authOptions)(req, res, next);
});

// Callback après authentification Google
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  async (req, res) => {
    try {
      // Créer un token JWT
      const token = jwt.sign(
        { 
          userId: req.user._id,
          email: req.user.email,
          isAdmin: req.user.isAdmin 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Récupérer l'URL de redirection depuis l'état
      let redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
      
      try {
        if (req.query.state) {
          const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
          if (state.redirect) {
            redirectUrl = `${redirectUrl}?redirect=${encodeURIComponent(state.redirect)}`;
          }
        }
      } catch (e) {
        console.error('Erreur lors du parsing de l\'état:', e);
      }

      // Rediriger vers le frontend avec le token
      res.redirect(`${redirectUrl}?token=${token}&success=true`);
    } catch (error) {
      console.error('Erreur lors de la création du token JWT:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  }
);

// Route pour obtenir le profil utilisateur
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        walletAddress: user.walletAddress,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du profil'
    });
  }
});

// Route pour se déconnecter
router.post('/logout', (req, res) => {
  // Dans une authentification JWT, la déconnexion est gérée côté client
  // en supprimant le token du stockage local
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

export default router;
