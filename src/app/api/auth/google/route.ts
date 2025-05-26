import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Clé secrète pour signer les JWT - dans un environnement de production, utilisez une variable d'environnement
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données de la requête
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { success: false, message: 'Credential is required' },
        { status: 400 }
      );
    }

    // Dans un environnement de production, vous devriez vérifier le token avec l'API Google
    // https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

    // Simuler la vérification et extraction des données utilisateur
    // Dans un vrai scénario, vous décoderiez le token et vérifieriez sa validité
    const googleId = `google-${Date.now()}`;
    const email = `user-${Date.now()}@example.com`;
    
    // Créer un objet utilisateur
    const user = {
      googleId,
      email,
      provider: 'google',
      createdAt: new Date().toISOString()
    };

    // Générer un JWT
    const token = jwt.sign(
      { 
        userId: googleId,
        email,
        provider: 'google',
        walletAddress: googleId // Utiliser googleId comme "adresse de portefeuille" simulée
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retourner le token et les informations utilisateur
    return NextResponse.json({
      success: true,
      token,
      user,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Error in Google authentication:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
