// testDiscordLink.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
} = process.env;

console.log("🔍 Vérification des variables d'environnement...");
console.log("DISCORD_CLIENT_ID:", DISCORD_CLIENT_ID || "❌ non défini");
console.log("DISCORD_CLIENT_SECRET:", DISCORD_CLIENT_SECRET ? "✅ défini" : "❌ non défini");
console.log("DISCORD_REDIRECT_URI:", DISCORD_REDIRECT_URI || "❌ non défini");

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
  console.error("❌ Les variables Discord ne sont pas correctement définies. Corrige ton .env ou ta config PM2.");
  process.exit(1);
}

// Simulation d'un appel vers l'API Discord avec un faux code (pour voir la structure de réponse)
const fakeCode = 'INVALID_CODE_FOR_TEST';

const testOAuthExchange = async () => {
  console.log("\n🚀 Test de l'échange OAuth2 avec un code invalide pour tester la réponse Discord...");
  
  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: fakeCode,
      redirect_uri: DISCORD_REDIRECT_URI
    })
  });

  const raw = await res.text();

  console.log(`↩️ Status code : ${res.status}`);
  console.log("🔍 Réponse brute :");
  console.log(raw.substring(0, 200));
};

testOAuthExchange();
