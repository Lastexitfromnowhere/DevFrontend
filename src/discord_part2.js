const loadNewsMessages = async () => {
  try {
    if (!discordClient || !DISCORD_NEWS_CHANNEL_ID) {
      console.error('Client Discord ou ID de canal non disponible');
      return;
    }
    const channel = await discordClient.channels.fetch(DISCORD_NEWS_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error('Canal news non trouvé ou non accessible');
      return;
    }
    console.log(`Chargement des messages du canal ${channel.name}...`);
    const messages = await channel.messages.fetch({ limit: 10 });
    newsMessages = Array.from(messages.values()).map(msg => ({
      id: msg.id,
      content: msg.content,
      author: msg.author.username,
      timestamp: msg.createdTimestamp,
      date: new Date(msg.createdTimestamp).toISOString(),
      attachments: Array.from(msg.attachments.values()).map(att => ({
        url: att.url,
        name: att.name,
        contentType: att.contentType
      }))
    })).sort((a, b) => b.timestamp - a.timestamp);
    console.log(`${newsMessages.length} messages chargés depuis le canal news`);
  } catch (error) {
    console.error('Erreur lors du chargement des messages:', error);
  }
};
initDiscordClient().catch(error => {
  console.error('Erreur lors de l\'initialisation du client Discord:', error);
});
router.get('/news', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  try {
    if (newsMessages.length === 0 && discordClient && discordClient.isReady()) {
      await loadNewsMessages();
    }
    res.json({
      success: true,
      messages: newsMessages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages Discord'
    });
  }
});
