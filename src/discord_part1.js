import express from 'express';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { Client, GatewayIntentBits } from 'discord.js';
import { authenticateToken } from '../middleware/auth.js';
import DiscordLink from '../models/DiscordLink.js';
import { sendMessageToDiscordChannel, sendDirectMessageToUser, assignRoleToUser, addUserToGuild } from '../utils/sendDiscordMessage.js';
import { maskWalletAddress, maskDiscordId } from '../utils/privacyUtils.js';
const router = express.Router();
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https:
const DISCORD_API_ENDPOINT = 'https:
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_NEWS_CHANNEL_ID = process.env.DISCORD_NEWS_CHANNEL_ID;
let discordClient;
let newsMessages = [];
console.log('Variables d\'environnement Discord:', {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: DISCORD_CLIENT_SECRET ? '***' : 'non défini',
  DISCORD_REDIRECT_URI,
  DISCORD_NEWS_CHANNEL_ID,
  NODE_ENV: process.env.NODE_ENV
});
const initDiscordClient = async () => {
  if (discordClient) return discordClient;
  try {
    console.log('Initialisation du client Discord pour le canal news...');
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
    discordClient.once('ready', async () => {
      console.log(`Bot connecté en tant que ${discordClient.user.tag}`);
      await loadNewsMessages();
    });
    discordClient.on('messageCreate', async (message) => {
      if (message.channel.id === DISCORD_NEWS_CHANNEL_ID) {
        console.log(`Nouveau message dans le canal news: ${message.content.substring(0, 30)}...`);
        const newsItem = {
          id: message.id,
          content: message.content,
          author: message.author.username,
          timestamp: message.createdTimestamp,
          date: new Date(message.createdTimestamp).toISOString(),
          attachments: Array.from(message.attachments.values()).map(att => ({
            url: att.url,
            name: att.name,
            contentType: att.contentType
          }))
        };
        newsMessages.unshift(newsItem);
        if (newsMessages.length > 10) {
          newsMessages = newsMessages.slice(0, 10);
        }
      }
    });
    await discordClient.login(DISCORD_BOT_TOKEN);
    return discordClient;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du client Discord:', error);
    return null;
  }
};
