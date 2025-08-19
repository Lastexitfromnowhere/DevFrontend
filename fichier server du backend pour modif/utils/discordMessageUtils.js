/**
 * Utilitaires pour les messages Discord
 */
import { maskWalletAddress, maskDiscordId } from './privacyUtils.js';

/**
 * Formate un message de liaison Discord avec les informations sensibles masquées
 * @param {string} walletAddress - Adresse du wallet
 * @param {string} username - Nom d'utilisateur Discord
 * @param {string} discordId - ID Discord
 * @returns {string} - Message formaté
 */
export function formatDiscordLinkMessage(walletAddress, username, discordId) {
  return `🔗 Le wallet \`${maskWalletAddress(walletAddress)}\` a lié son compte Discord \`${username}\` (ID: ${maskDiscordId(discordId)})`;
}

/**
 * Formate un message de liaison Discord après résolution de conflit
 * @param {string} walletAddress - Adresse du wallet
 * @param {string} username - Nom d'utilisateur Discord
 * @param {string} discordId - ID Discord
 * @returns {string} - Message formaté
 */
export function formatDiscordConflictResolutionMessage(walletAddress, username, discordId) {
  return `🔗 Après résolution de conflit, le wallet \`${maskWalletAddress(walletAddress)}\` a lié son compte Discord \`${username}\` (ID: ${maskDiscordId(discordId)})`;
}

/**
 * Formate un message de déliaison Discord
 * @param {string} walletAddress - Adresse du wallet
 * @param {string} username - Nom d'utilisateur Discord
 * @returns {string} - Message formaté
 */
export function formatDiscordUnlinkMessage(walletAddress, username) {
  return `❌ Le wallet \`${maskWalletAddress(walletAddress)}\` a supprimé son lien avec le compte Discord \`${username}\``;
}
