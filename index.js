import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.BOT_TOKEN;

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

// ----------------------
// !build command
// ----------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ----------------- !build -----------------
  if (message.content.startsWith('!build')) {
    const args = message.content.split(' ');
    const buildId = args[1];
    if (!buildId) return message.reply('Please provide a build ID: `!build 302546`');

    try {
      const buildRes = await axios.get('https://api.deadlock-api.com/v1/builds', {
        params: { build_id: buildId, only_latest: true },
      });
      const buildData = buildRes.data[0]?.hero_build;
      if (!buildData) return message.reply('Build not found.');

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
      if (categoryNames.length === 0) return message.reply('No items found.');

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

      const msg = await message.reply({ embeds: [embeds[page]], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', i => {
        if (i.user.id !== message.author.id) return i.reply({ content: "These buttons aren't for you!", ephemeral: true });

        if (i.customId === 'next') page = (page + 1) % embeds.length;
        if (i.customId === 'prev') page = (page - 1 + embeds.length) % embeds.length;

        i.update({ embeds: [embeds[page]], components: [row] });
      });

    } catch (err) {
      console.error(err);
      message.reply('Failed to fetch build data.');
    }
  }

  // ----------------- !hero -----------------
  if (message.content.startsWith('!hero')) {
    const args = message.content.split(' ');
    const heroNameInput = args.slice(1).join(' ');
    if (!heroNameInput) return message.reply('Please provide a hero name: `!hero Infernus`');

    try {
      console.log(`[HERO CMD] User requested hero: ${heroNameInput}`);

      // Fetch heroes and find matching one
      const heroesRes = await axios.get('https://assets.deadlock-api.com/v2/heroes');
      const heroes = heroesRes.data;
      const hero = heroes.find(h => h.name.toLowerCase() === heroNameInput.toLowerCase());

      if (!hero) {
        console.log(`[HERO CMD] No hero found for: ${heroNameInput}`);
        return message.reply(`Hero **${heroNameInput}** not found.`);
      }

      console.log(`[HERO CMD] Matched hero: ${hero.name} (ID: ${hero.id})`);

      // Fetch all hero stats
      const statsUrl = 'https://api.deadlock-api.com/v1/analytics/hero-stats';
      console.log(`[HERO CMD] Fetching stats from: ${statsUrl}`);

      const statsRes = await axios.get(statsUrl);
      const allStats = statsRes.data;

      // Total matches across all heroes
      const totalMatches = allStats.reduce((sum, s) => sum + (s.matches || 0), 0);

      // Find this hero's stats
      const stats = allStats.find(s => s.hero_id === hero.id);
      if (!stats) {
        console.log(`[HERO CMD] No stats found for hero ${hero.id}`);
        return message.reply(`No stats found for **${hero.name}**.`);
      }

      console.log(`[HERO CMD] Found stats for ${hero.name}:`, stats);

      // Calculate derived metrics
      const pickRate = totalMatches > 0 ? (stats.matches / totalMatches) * 100 : 0;
      const winRate = stats.matches ? (stats.wins / stats.matches) * 100 : 0;
      const avgKills = stats.matches ? stats.total_kills / stats.matches : 0;
      const avgDeaths = stats.matches ? stats.total_deaths / stats.matches : 0;
      const avgAssists = stats.matches ? stats.total_assists / stats.matches : 0;
      const avgGPM = stats.matches ? stats.total_net_worth / stats.matches / 30 : 0; // assuming 30 min avg match

      // Souls per minute (SPM) assuming ~45 min average match length
      const avgSPM = stats.matches 
        ? stats.total_net_worth / (stats.matches * 45) 
        : 0;

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

      message.reply({ embeds: [embed] });

    } catch (err) {
      console.error('[HERO CMD] Error fetching hero stats:', err.response?.data || err.message || err);
      message.reply('Failed to fetch hero stats.');
    }
  }
});

client.login(token);
