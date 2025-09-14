import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ActivityType ,ButtonStyle, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';
import { readFileSync } from 'fs';
import 'dotenv/config';
import { setChannel, getChannel, getAllChannels } from './broadcastChannels.js';
import { buildItemEmbed } from "./itemembed.js"; // path to parser


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
        { name: '/setbroadcast <channel>', value: 'Set the broadcast channel for this server (Mod only)', inline: false },
        { name: '/help', value: 'Show this help menu', inline: false }
      )
      .setColor(0xffcc00)
      .setFooter({ text: 'Use a command by typing / followed by its name!' });

    return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }

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
      if (buildData.details.ability_order?.currency_changes?.length) {
        const abilitySequence = [];

        for (const change of buildData.details.ability_order.currency_changes) {
          const ability = abilities.find(a => a.id === change.ability_id);
          if (!ability) continue;

          const points = Math.abs(change.delta);
          for (let i = 0; i < points; i++) {
            abilitySequence.push(ability.name);
          }
        }

        // Combine consecutive duplicates for cleaner display
        const combinedSequence = [];
        let last = null;
        let count = 0;

        for (const name of abilitySequence) {
          if (name === last) {
            count++;
          } else {
            if (last) combinedSequence.push(`**${last}** ×${count}`);
            last = name;
            count = 1;
          }
        }
        if (last) combinedSequence.push(`**${last}** ×${count}`);

        categories['Ability Order'] = combinedSequence;
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
      const heroesRes = await axios.get('https://assets.deadlock-api.com/v2/heroes');
      const heroes = heroesRes.data;
      const hero = heroes.find(h => h.name.toLowerCase() === heroNameInput.toLowerCase());
      if (!hero) return interaction.reply(`Hero **${heroNameInput}** not found.`);

      const statsRes = await axios.get('https://api.deadlock-api.com/v1/analytics/hero-stats');
      const allStats = statsRes.data;

      const totalMatches = allStats.reduce((sum, s) => sum + (s.matches || 0), 0);
      const stats = allStats.find(s => s.hero_id === hero.id);
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

    const embed = buildItemEmbed(item);
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
