import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ActivityType ,ButtonStyle, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';
import { readFileSync } from 'fs';
import 'dotenv/config';
import { setChannel, getChannel, getAllChannels } from './broadcastChannels.js';
import { buildItemEmbed } from "./itemembed.js"; // path to parser
import { REGISTRY } from "./userRegistry.js";
import { getLastMatch, getHeroId, heroName, HEROES } from "./matches.js"; // NEW
import { getItem, dcImageFile } from "./item_utils.js"; // NEW


const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.BOT_TOKEN;


// Read lines from file

const lines = readFileSync('lines.txt', 'utf-8')
  .split('\n')
  .filter(line => line.trim() !== '');

function getRandomLine() {
  return lines[Math.floor(Math.random() * lines.length)];
}


// Register Slash Commands

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Set custom activity
  client.user.setActivity('Reading about the Knickerbockers!', {
    type: ActivityType.Custom
  });

  client.user.setPresence({
    status: 'online',
  });

  const commands = [
    new SlashCommandBuilder()
      .setName('build')
      .setDescription('Get a hero build')
      .addStringOption(option =>
        option.setName('id')
          .setDescription('Build ID')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('hero')
      .setDescription('Get hero stats')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Hero Name')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('item')
      .setDescription('Get item info')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Item Name')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('feedback')
      .setDescription("Provide some feedback")
      .addStringOption(option =>
        option.setName('message')
        .setDescription('Feedback or Suggestion')
        .setRequired(true)
      ),
      new SlashCommandBuilder()
      .setName('setbroadcast')
      .setDescription('Set the broadcast channel for this server (Mod only)')
      .addChannelOption(option =>
        option.setName('channel')
        .setDescription('Channel to set as broadcast channel')
        .setRequired(true)
      ),
      new SlashCommandBuilder()
      .setName('broadcast')
      .setDescription('Broadcast a message to all servers (Owner only)')
      .addStringOption(option =>
        option.setName('message')
        .setDescription('Message to broadcast')
        .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("register")
      .setDescription("Link your SteamID3 to your Discord account")
      .addStringOption(option =>
        option.setName("steamid")
          .setDescription("Your SteamID3 (e.g. [U:1:123456])")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("unregister")
      .setDescription("Remove your linked SteamID3"),
    new SlashCommandBuilder()
      .setName('lastmatch')
      .setDescription('Retrieve your last played match using your registered SteamID'),
    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('Get your personal stats for a specific hero')
      .addStringOption(option =>
        option.setName('hero')
          .setDescription('Hero name')
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Show a list of all available commands'),
  ].map(cmd => cmd.toJSON());

  await client.application.commands.set(commands);
  console.log('Slash commands registered.');

  // Debug: Print servers the bot is in
  console.log(`The bot is in ${client.guilds.cache.size} servers:`);
  client.guilds.cache.forEach(guild => {
    console.log(`- ${guild.name} (${guild.id})`);
  });
});


// Broadcast function with fallback
async function broadcastMessage(client, messageText) {
  const channels = getAllChannels(); // Map of guildId -> channelId

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      let channel = null;

      // Use saved broadcast channel if available
      const savedChannelId = channels.get(guildId);
      if (savedChannelId) {
        channel = await guild.channels.fetch(savedChannelId).catch(() => null);
      }

      // Fallback: system channel
      if (!channel) {
        channel = guild.systemChannel;
      }

      // Fallback: first text channel bot can send in
      if (!channel) {
        channel = guild.channels.cache.find(
          c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages')
        );
      }

      if (channel) {
        await channel.send(messageText);
        console.log(`Broadcast sent to ${guild.name} (#${channel.name})`);
      } else {
        console.log(`No valid channel in ${guild.name} (${guild.id})`);
      }

    } catch (err) {
      console.error(`Failed to broadcast to ${guild.name} (${guild.id}):`, err.message);
    }
  }
}


// Handle Interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // ----------------- /help -----------------
  if (commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('📖 Bot Commands')
      .setDescription('Here are all the available commands:')
      .addFields(
        { name: '/build <id>', value: 'Get a hero build by ID', inline: false },
        { name: '/hero <name>', value: 'Get stats for a specific hero', inline: false },
        { name: '/item <name>', value: 'Get item information', inline: false },
        { name: '/feedback <feedback>', value: 'Provide some feedback', inline: false },
        { name: '/register <steamid>', value: 'Link your SteamID3 to your Discord account', inline: false },
        { name: '/unregister', value: 'Remove your linked SteamID3', inline: false },
        { name: '/lastmatch', value: 'Retrieve your last played match using your registered SteamID', inline: false },
        { name: '/stats <hero>', value: 'Get your personal stats for a specific hero', inline: false },
        { name: '/setbroadcast <channel>', value: 'Set the broadcast channel for this server (Mod only)', inline: false },
        { name: '/help', value: 'Show this help menu', inline: false }
      )
      .setColor(0xffcc00)
      .setFooter({ text: 'Use a command by typing / followed by its name!' });

    return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }

  // ----------------- /register -----------------
  if (commandName === "register") {
    const input = interaction.options.getString("steamid");
    const discordId = interaction.user.id;

    // Allow both "[U:1:123456]" and "123456"
    let steamId;
    const steamId3Pattern = /^\[U:1:\d+\]$/;
    const numericPattern = /^\d+$/;

    if (steamId3Pattern.test(input)) {
      steamId = input; // already full SteamID3
    } else if (numericPattern.test(input)) {
      steamId = `[U:1:${input}]`; // convert to SteamID3
    } else {
      return interaction.reply({
        content: "Invalid input. Please provide either a SteamID3 like `[U:1:123456]` or just the numeric ID `123456`.",
        ephemeral: true,
      });
    }

    REGISTRY.register(discordId, steamId);

    return interaction.reply({
      content: `Registered your Discord account to SteamID: **${steamId}**`,
      ephemeral: true,
    });
  }

  // ----------------- /unregister -----------------
  if (commandName === "unregister") {
    const discordId = interaction.user.id;

    if (!REGISTRY.isRegistered(discordId)) {
      return interaction.reply({
        content: "You don't have a SteamID linked.",
        ephemeral: true,
      });
    }

    REGISTRY.unregister(discordId);

    return interaction.reply({
      content: "Your SteamID has been unlinked.",
      ephemeral: true,
    });
  }

  // ----------------- /lastmatch -----------------
  /*if (commandName === "lastmatch") {
    const discordId = interaction.user.id;

    if (!REGISTRY.isRegistered(discordId)) {
      return interaction.reply({ 
        content: "You must first link your SteamID using `/register`.", 
        ephemeral: true 
      });
    }

    const steamId = REGISTRY.get(discordId);

    try {
      // Fetch recent matches (limit 1)
      const res = await axios.get("https://api.deadlock-api.com/v1/matches", {
        params: { steam_id: steamId, limit: 1 }
      });
      console.log(`[LASTMATCH] Match history response:`, res.data);

      const matches = res.data;
      if (!matches || matches.length === 0) {
        console.log(`[LASTMATCH] No matches found for SteamID ${steamId}.`);
        return interaction.reply("No matches found for your SteamID.");
      }

      const lastMatchData = matches[0];

      // Fetch detailed match metadata
      const lmRes = await axios.get(
        `https://api.deadlock-api.com/v1/matches/${lastMatchData.match_id}/metadata`
      );
      const lmDetailed = lmRes.data;

      // Construct DigestLM object
      const digest = new DigestLM(steamId, lmDetailed);

      // Build inventory image
      const inventoryImage = await dcImageFile(digest.playerItems);
      const buffer = await inventoryImage.png().toBuffer();

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Last Match for ${interaction.user.username}`)
        .setDescription(`Match ID: **${digest.lmId}**`)
        .addFields(
          { name: "Hero", value: heroName(digest.playerHero) || "Unknown", inline: true },
          { name: "Result", value: digest.victory ? "Win" : "Loss", inline: true },
          { name: "K/D/A", value: `${digest.kills}/${digest.deaths}/${digest.assists}`, inline: true },
          { name: "Duration", value: `${Math.floor(digest.duration / 60)} min`, inline: true }
        )
        .setColor(digest.victory ? 0x2ecc71 : 0xe74c3c)
        .setTimestamp()
        .setImage('attachment://inventory.png');

      // Reply with embed and inventory image
      return interaction.reply({
        embeds: [embed],
        files: [{ attachment: buffer, name: 'inventory.png' }]
      });

    } catch (err) {
      console.error("[LASTMATCH CMD] Error:", err.response?.data || err.message || err);
      return interaction.reply("Failed to fetch your last match.");
    }
  }*/


  // ----------------- /stats -----------------
  /*if (commandName === "stats") {
    const discordId = interaction.user.id;
    const heroInput = interaction.options.getString("hero");

    if (!REGISTRY.isRegistered(discordId)) {
      return interaction.reply({ content: "You must first link your SteamID using `/register`.", ephemeral: true });
    }

    const steamId = REGISTRY.get(discordId);

    try {
      // 1. Fetch recent matches for this player
      const matchesRes = await axios.get(`https://api.deadlock-api.com/v1/matches`, {
        params: { steam_id: steamId, limit: 100 }
      });
      const matches = matchesRes.data;

      // 2. Resolve hero ID using aliases
      const heroId = getHeroId(heroInput);
      if (!heroId) return interaction.reply(`Hero **${heroInput}** not found.`);

      // 3. Filter matches for this hero
      const heroMatches = matches.filter(m => m.hero_id === heroId);
      if (heroMatches.length === 0) return interaction.reply(`No matches found for **${heroInput}**.`);

      // 4. Aggregate stats
      const totalMatches = heroMatches.length;
      const totalWins = heroMatches.filter(m => m.result === "win").length;
      const totalKills = heroMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
      const totalDeaths = heroMatches.reduce((sum, m) => sum + (m.deaths || 0), 0);
      const totalAssists = heroMatches.reduce((sum, m) => sum + (m.assists || 0), 0);

      const embed = new EmbedBuilder()
        .setTitle(`📊 Stats for ${heroInput} (${interaction.user.username})`)
        .addFields(
          { name: "Matches", value: totalMatches.toString(), inline: true },
          { name: "Wins", value: totalWins.toString(), inline: true },
          { name: "Win Rate", value: `${((totalWins / totalMatches) * 100).toFixed(2)}%`, inline: true },
          { name: "Avg Kills", value: (totalKills / totalMatches).toFixed(2), inline: true },
          { name: "Avg Deaths", value: (totalDeaths / totalMatches).toFixed(2), inline: true },
          { name: "Avg Assists", value: (totalAssists / totalMatches).toFixed(2), inline: true }
        )
        .setColor(0x3498db)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("[STATS CMD] Error:", err);
      return interaction.reply("Failed to fetch your hero stats.");
    }
  }*/


  // ----------------- /build -----------------
  if (commandName === 'build') {
    const buildId = interaction.options.getString('id');

    try {
      const buildRes = await axios.get('https://api.deadlock-api.com/v1/builds', {
        params: { build_id: buildId, only_latest: true },
      });
      const buildData = buildRes.data[0]?.hero_build;
      if (!buildData) return interaction.reply('Build not found.');

      const heroesRes = await axios.get('https://assets.deadlock-api.com/v2/heroes');
      const heroes = heroesRes.data;
      const hero = heroes.find(h => h.id === buildData.hero_id);
      const heroName = hero ? hero.name : `Unknown Hero (${buildData.hero_id})`;
      const heroImage = hero?.images?.icon_image_small || null;

      const upgradesRes = await axios.get('https://assets.deadlock-api.com/v2/items/by-type/upgrade');
      const upgrades = upgradesRes.data;

      const abilitiesRes = await axios.get('https://assets.deadlock-api.com/v2/items/by-type/ability');
      const abilities = abilitiesRes.data;

      const categories = {};

      // ----- MOD CATEGORIES -----
      for (const category of buildData.details.mod_categories) {
        categories[category.name] = category.mods.map(mod => {
          const upgrade = upgrades.find(u => u.id === mod.ability_id);
          return upgrade
            ? `**${upgrade.name}** (Cost: ${upgrade.cost}, Tier: ${upgrade.item_tier})`
            : `Unknown Item (${mod.ability_id})`;
        });
      }

      // ----- ABILITY ORDER -----
      const currencyChanges = buildData.details.ability_order?.currency_changes || [];
      if (currencyChanges.length) {
        const abilitySeen = {}; // track first unlock
        const abilitySequence = [];

        for (const change of currencyChanges) {
          const ability = abilities.find(a => a.id === change.ability_id);
          if (!ability) continue;

          const absDelta = Math.abs(change.delta);

          // skip first unlock
          if (!abilitySeen[ability.id]) {
            abilitySeen[ability.id] = true;
            continue;
          }

          // map delta to tier
          let tier = '';
          if (absDelta === 1) tier = 'Tier 1';
          else if (absDelta === 2) tier = 'Tier 2';
          else if (absDelta === 5) tier = 'Tier 3';
          else tier = `Tier ? (${absDelta})`;

          abilitySequence.push(`${ability.name} ${tier}`);
        }

        if (abilitySequence.length > 0) {
          categories['Ability Order'] = abilitySequence;
        }
      }

      const categoryNames = Object.keys(categories);
      if (categoryNames.length === 0) return interaction.reply('No items found.');

      const embeds = categoryNames.map(name => {
        const embed = new EmbedBuilder()
          .setTitle(`Character: ${heroName}`)
          .addFields(
            { name: 'Build Name', value: buildData.name, inline: true },
            { name: 'Build Version', value: buildData.version.toString(), inline: true },
            { name: `Item Group: ${name}`, value: categories[name].join('\n') }
          )
          .setColor(0x00ff00)
          .setFooter({ text: `Build ID: ${buildData.hero_build_id}` });

        if (heroImage) embed.setThumbnail(heroImage);
        return embed;
      });

      let page = 0;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️ Prev').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('next').setLabel('Next ➡️').setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ content: getRandomLine(), embeds: [embeds[page]], components: [row], fetchReply: true });

      const replyMessage = await interaction.fetchReply();
      const collector = replyMessage.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: "These buttons aren't for you!", ephemeral: true });

        if (i.customId === 'next') page = (page + 1) % embeds.length;
        if (i.customId === 'prev') page = (page - 1 + embeds.length) % embeds.length;

        i.update({ embeds: [embeds[page]], components: [row] });
      });

    } catch (err) {
      console.error(err);
      interaction.reply('Failed to fetch build data.');
    }
  }


  // ----------------- /hero -----------------
  if (commandName === 'hero') {
    const heroNameInput = interaction.options.getString('name');
    
    try {
      // Resolve hero ID using aliases
      const heroId = getHeroId(heroNameInput);
      if (!heroId) return interaction.reply(`Hero **${heroNameInput}** not found.`);

      // Look up the hero object from HEROES array
      const hero = HEROES.find(h => h.id === heroId);
      if (!hero) return interaction.reply(`Hero **${heroNameInput}** not found.`);

      const statsRes = await axios.get('https://api.deadlock-api.com/v1/analytics/hero-stats');
      const allStats = statsRes.data;

      const totalMatches = allStats.reduce((sum, s) => sum + (s.matches || 0), 0);
      const stats = allStats.find(s => s.hero_id === heroId);
      if (!stats) return interaction.reply(`No stats found for **${hero.name}**.`);

      const pickRate = totalMatches > 0 ? (stats.matches / totalMatches) * 100 : 0;
      const winRate = stats.matches ? (stats.wins / stats.matches) * 100 : 0;
      const avgKills = stats.matches ? stats.total_kills / stats.matches : 0;
      const avgDeaths = stats.matches ? stats.total_deaths / stats.matches : 0;
      const avgAssists = stats.matches ? stats.total_assists / stats.matches : 0;
      const avgSPM = stats.matches ? stats.total_net_worth / (stats.matches * 45) : 0;

      const embed = new EmbedBuilder()
        .setTitle(`📊 Stats for ${hero.name}`)
        .setThumbnail(hero?.images?.icon_image_small || null)
        .addFields(
          { name: 'Pick Rate', value: `${pickRate.toFixed(2)}%`, inline: true },
          { name: 'Win Rate', value: `${winRate.toFixed(2)}%`, inline: true },
          { name: 'Avg Kills', value: avgKills.toFixed(2), inline: true },
          { name: 'Avg Deaths', value: avgDeaths.toFixed(2), inline: true },
          { name: 'Avg Assists', value: avgAssists.toFixed(2), inline: true },
          { name: 'Avg Souls Per Minute', value: avgSPM.toFixed(2), inline: true }
        )
        .setColor(0x3498db)
        .setFooter({ text: `Hero ID: ${hero.id}` });

      await interaction.reply({ content: getRandomLine(), embeds: [embed] });

    } catch (err) {
      console.error('[HERO CMD] Error fetching hero stats:', err.response?.data || err.message || err);
      interaction.reply('Failed to fetch hero stats.');
    }
  }

  // ----------------- /item -----------------
  if (commandName === "item") {
    const itemName = interaction.options.getString("name");

    const upgradesRes = await axios.get("https://assets.deadlock-api.com/v2/items/by-type/upgrade");
    const upgrades = upgradesRes.data;

    const item = upgrades.find(
      (u) => u.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!item) {
      return interaction.reply({ content: "Item not found!", ephemeral: true });
    }

    // Pass the full fetched array into buildItemEmbed
    const embed = buildItemEmbed(item, upgrades);

    await interaction.reply({ content: getRandomLine(), embeds: [embed] });
  }

  // ----------------- /broadcast -----------------
  if (commandName === "broadcast") {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const messageText = interaction.options.getString('message');

    await interaction.reply({ content: 'Broadcasting message to all servers...', ephemeral: true });

    await broadcastMessage(client, messageText);

    await interaction.followUp({ content: 'Broadcast completed.', ephemeral: true });
  }

  // ----------------- /setbroadcast -----------------
  if (commandName === 'setbroadcast') {
  // Check permissions
  if (!interaction.member.permissions.has('ManageGuild')) {
    return interaction.reply({
      content: "You need **Manage Server** permission to set the broadcast channel.",
      ephemeral: true,
    });
  }

  const channel = interaction.options.getChannel('channel');

  // Make sure it's a text channel
  if (!channel.isTextBased()) {
    return interaction.reply({
      content: "Please choose a text-based channel.",
      ephemeral: true,
    });
  }

  // Save it to broadcastStore
  setChannel(interaction.guild.id, channel.id);

  await interaction.reply({
    content: `Broadcast channel set to ${channel} for this server.`,
    ephemeral: true,
  });
}

  // ----------------- /feedback -----------------
  if (commandName === "feedback") {
    const feedbackMsg = interaction.options.getString('message');

    try {
      await interaction.reply ({
        content: 'Thanks for your feedback! ',
      });
      console.log(`[FEEDBACK] From ${interaction.user.tag} (${interaction.user.id}): ${feedbackMsg}`);
      const owner = await client.users.fetch(process.env.OWNER_ID);
      if (owner) {
        owner.send ({
          embeds: [
            new EmbedBuilder ()
            .setTitle('Feedback')
            .addFields(
              { name: 'From', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
              { name: 'Feedback', value: feedbackMsg, inline: false }
            )
            .setColor(0x9b59b6)
            .setTimestamp()
          ]
        }).catch(err => console.error("Failed to send DM:", err));
      }

      console.log(`[FEEDBACK] From ${interaction.user.tag} (${interaction.user.id}): ${feedbackMsg}`);

    } catch (err) {
      console.error('[FEEDBACK CMD] Error:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply('Failed to submit feedback.');
      } else {
        await interaction.reply('Failed to submit feedback.');
      }
    }
  }
});

client.login(token);
