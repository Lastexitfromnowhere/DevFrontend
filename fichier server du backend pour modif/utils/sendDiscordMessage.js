import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

// Fonction utilitaire pour masquer les informations sensibles
export function maskSensitiveInfo(text, keepStart = 6, keepEnd = 4) {
  if (!text || typeof text !== 'string') return text;
  
  // Si le texte est trop court, on le masque complètement
  if (text.length <= keepStart + keepEnd) {
    return '***' + text.substring(text.length - 3);
  }
  
  // Sinon on garde le début et la fin, et on masque le milieu
  return text.substring(0, keepStart) + '...' + text.substring(text.length - keepEnd);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

client.login(process.env.DISCORD_TOKEN);

// Attendre que le client soit prêt
client.on('ready', () => {
  console.log(`🔔 Bot Discord connecté en tant que ${client.user.tag}`);
});

// Fonction pour envoyer un message dans un canal Discord
export async function sendMessageToDiscordChannel(content) {
  const channelId = process.env.DISCORD_CHANNEL_ID;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel) {
      return await channel.send(content);
    } else {
      console.error('❌ Channel introuvable');
      return null;
    }
  } catch (err) {
    console.error('❌ Erreur lors de l\'envoi Discord :', err);
    return null;
  }
}

// Fonction pour envoyer un message privé à un utilisateur Discord
export async function sendDirectMessageToUser(discordId, content) {
  try {
    const user = await client.users.fetch(discordId);
    if (user) {
      const dm = await user.createDM();
      return await dm.send(content);
    } else {
      console.error(`❌ Utilisateur Discord introuvable: ${maskSensitiveInfo(discordId)}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ Erreur lors de l'envoi du message privé à ${maskSensitiveInfo(discordId)}:`, err);
    return null;
  }
}

// Fonction pour ajouter un utilisateur au serveur Discord
export async function addUserToGuild(discordId, accessToken) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      console.error('❌ ID du serveur Discord non configuré');
      return false;
    }

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.error('❌ Serveur Discord introuvable');
      return false;
    }

    // Vérifier si l'utilisateur est déjà membre du serveur
    try {
      const existingMember = await guild.members.fetch(discordId);
      if (existingMember) {
        console.log(`🔔 L'utilisateur ${maskSensitiveInfo(discordId)} est déjà membre du serveur`);
        return true; // L'utilisateur est déjà membre, pas besoin de l'ajouter
      }
    } catch (err) {
      // L'utilisateur n'est pas membre, on continue pour l'ajouter
      console.log(`🔔 L'utilisateur ${maskSensitiveInfo(discordId)} n'est pas encore membre du serveur`);
    }

    // Ajouter l'utilisateur au serveur en utilisant l'API Discord directement
    console.log(`🔔 Tentative d'ajout de l'utilisateur ${maskSensitiveInfo(discordId)} au serveur...`);
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: accessToken
        })
      });

      if (response.ok || response.status === 204) {
        console.log(`🔔 Utilisateur ${maskSensitiveInfo(discordId)} ajouté au serveur avec succès`);
        
        // Attendre 10 secondes pour s'assurer que Discord a bien synchronisé l'ajout du membre
        console.log(`🔔 Attente de 10 secondes pour la synchronisation Discord...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Vérifier que l'utilisateur est bien membre du serveur après l'attente
        try {
          const verifyMember = await guild.members.fetch(discordId);
          if (verifyMember) {
            console.log(`🔔 Vérification réussie: l'utilisateur ${maskSensitiveInfo(discordId)} est bien membre du serveur`);
            return true;
          } else {
            console.warn(`⚠️ L'utilisateur ${maskSensitiveInfo(discordId)} n'est pas détecté comme membre après l'ajout`);
            return false;
          }
        } catch (verifyErr) {
          console.error(`❌ Erreur lors de la vérification du membre après ajout:`, verifyErr);
          return false;
        }
      } else {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignorer les erreurs de parsing JSON
        }
        console.error(`❌ Erreur lors de l'ajout de l'utilisateur au serveur:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return false;
      }
    } catch (fetchErr) {
      console.error(`❌ Erreur lors de la requête pour ajouter l'utilisateur au serveur:`, fetchErr);
      return false;
    }
  } catch (err) {
    console.error(`❌ Erreur générale lors de l'ajout de l'utilisateur au serveur:`, err);
    return false;
  }
}

// Fonction pour attribuer un rôle à un utilisateur Discord
export async function assignRoleToUser(discordId, roleName) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      console.error('❌ ID du serveur Discord non configuré');
      return false;
    }

    // Récupérer le serveur Discord
    let guild;
    try {
      guild = await client.guilds.fetch(guildId);
      if (!guild) {
        console.error('❌ Serveur Discord introuvable');
        return false;
      }
    } catch (guildErr) {
      console.error('❌ Erreur lors de la récupération du serveur Discord:', guildErr);
      return false;
    }

    // Trouver le rôle par son nom
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      console.error(`❌ Rôle "${roleName}" introuvable`);
      return false;
    }

    // Vérifier les permissions du bot
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      console.error('❌ Le bot n\'a pas la permission de gérer les rôles');
      return false;
    }

    // Vérifier si le rôle du bot est plus élevé que le rôle à attribuer
    if (guild.members.me.roles.highest.position <= role.position) {
      console.error('❌ Le rôle du bot n\'est pas assez élevé pour attribuer ce rôle');
      return false;
    }

    // Essayer de récupérer le membre avec plusieurs tentatives
    let member = null;
    let attempts = 0;
    const maxAttempts = 5; // Augmenté de 3 à 5 tentatives
    
    while (attempts < maxAttempts && !member) {
      try {
        console.log(`🔔 Tentative ${attempts + 1}/${maxAttempts} de récupération du membre ${maskSensitiveInfo(discordId)}...`);
        member = await guild.members.fetch(discordId);
        if (member) {
          console.log(`🔔 Membre ${maskSensitiveInfo(discordId)} trouvé avec succès`);
          break;
        }
      } catch (memberErr) {
        console.warn(`⚠️ Tentative ${attempts + 1}/${maxAttempts} échouée:`, memberErr.message);
        
        if (attempts < maxAttempts - 1) {
          // Attendre 5 secondes avant la prochaine tentative
          console.log(`🔔 Attente de 5 secondes avant la prochaine tentative...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      attempts++;
    }

    if (!member) {
      console.error(`❌ Impossible de récupérer le membre ${maskSensitiveInfo(discordId)} après ${maxAttempts} tentatives`);
      return false;
    }

    // Attribuer le rôle
    try {
      await member.roles.add(role);
      console.log(`🔔 Rôle "${roleName}" attribué à ${member.user.tag}`);
      return true;
    } catch (roleErr) {
      console.error(`❌ Erreur lors de l'attribution du rôle:`, roleErr);
      return false;
    }
  } catch (err) {
    console.error(`❌ Erreur générale lors de l'attribution du rôle:`, err);
    return false;
  }
}
