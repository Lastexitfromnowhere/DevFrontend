// config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Configuration de la stratégie Google OAuth2
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
    scope: ['profile', 'email'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (user) {
        // Mettre à jour les informations de l'utilisateur existant
        user.googleId = user.googleId || profile.id;
        user.email = user.email || profile.emails[0].value;
        user.displayName = user.displayName || profile.displayName;
        user.firstName = user.firstName || profile.name.givenName;
        user.lastName = user.lastName || profile.name.familyName;
        user.profilePicture = user.profilePicture || (profile.photos && profile.photos[0].value);
        user.lastLogin = new Date();
        
        await user.save();
        return done(null, user);
      }

      // Créer un nouvel utilisateur
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profilePicture: profile.photos && profile.photos[0].value,
        lastLogin: new Date(),
        isAdmin: false
      });

      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      console.error('Erreur lors de l\'authentification Google:', error);
      return done(error, false);
    }
  }
));

// Sérialisation de l'utilisateur
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Désérialisation de l'utilisateur
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
