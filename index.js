import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ActivityType ,ButtonStyle, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';
import { readFileSync } from 'fs';
import 'dotenv/config';
import { buildItemEmbed } from "./itemembed.js"; // path to parser


const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.BOT_TOKEN;

// ----------------------
// Read lines from file
// ----------------------
const lines = readFileSync('lines.txt', 'utf-8')
  .split('\n')
  .filter(line => line.trim() !== '');

function getRandomLine() {
  return lines[Math.floor(Math.random() * lines.length)];
}

// ----------------------
// Register Slash Commands
// ----------------------
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Set custom activity
  client.user.setActivity('Reading about the Knickerbockers!', {
    type: ActivityType.Custom
  });

  client.user.setPresence({
    status: 'online', // online, idle, dnd, invisible
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
      .setName('help')
      .setDescription('Show a list of all available commands'),
  ].map(cmd => cmd.toJSON());

  await client.application.commands.set(commands);
  console.log('Slash commands registered.');
});

// ----------------------
// Handle Interactions
// ----------------------
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

      const categories = {};
      for (const category of buildData.details.mod_categories) {
        categories[category.name] = category.mods.map(mod => {
          const upgrade = upgrades.find(u => u.id === mod.ability_id);
          return upgrade
            ? `**${upgrade.name}** (Cost: ${upgrade.cost}, Tier: ${upgrade.item_tier})`
            : `Unknown Item (${mod.ability_id})`;
        });
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
  if (interaction.commandName === "item") {
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
});

client.login(token);