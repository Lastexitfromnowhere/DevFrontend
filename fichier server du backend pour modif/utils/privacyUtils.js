/**
 * Utilitaires pour la protection de la vie privée
 */

/**
 * Masque une partie d'une chaîne de caractères sensible (wallet, ID Discord, etc.)
 * @param {string} text - Texte à masquer
 * @param {number} keepStart - Nombre de caractères à garder au début
 * @param {number} keepEnd - Nombre de caractères à garder à la fin
 * @returns {string} - Texte masqué
 */
export function maskSensitiveInfo(text, keepStart = 6, keepEnd = 4) {
  if (!text || typeof text !== 'string') return text;
  
  // Si le texte est trop court, on le masque complètement
  if (text.length <= keepStart + keepEnd) {
    return '***' + text.substring(text.length - 3);
  }
  
  // Sinon on garde le début et la fin, et on masque le milieu
  return text.substring(0, keepStart) + '...' + text.substring(text.length - keepEnd);
}

/**
 * Masque une adresse de wallet pour l'affichage
 * @param {string} walletAddress - Adresse du wallet à masquer
 * @returns {string} - Adresse masquée
 */
export function maskWalletAddress(walletAddress) {
  return maskSensitiveInfo(walletAddress, 6, 4);
}

/**
 * Masque un ID Discord pour l'affichage
 * @param {string} discordId - ID Discord à masquer
 * @returns {string} - ID masqué
 */
export function maskDiscordId(discordId) {
  return maskSensitiveInfo(discordId, 5, 3);
}
