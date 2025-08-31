import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';
import 'dotenv/config';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.BOT_TOKEN;

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!build')) return;

  const args = message.content.split(' ');
  const buildId = args[1];
  if (!buildId) return message.reply('Please provide a build ID: `!build 302546`');

  try {
    // Fetch the build
    const buildRes = await axios.get('https://api.deadlock-api.com/v1/builds', {
      params: { build_id: buildId, only_latest: true },
    });
    const buildData = buildRes.data[0]?.hero_build;
    if (!buildData) return message.reply('Build not found.');

    // Fetch all heroes
    const heroesRes = await axios.get('https://assets.deadlock-api.com/v2/heroes');
    const heroes = heroesRes.data;
    const hero = heroes.find(h => h.id === buildData.hero_id);
    const heroName = hero ? hero.name : `Unknown Hero (${buildData.hero_id})`;
    const heroImage = hero?.images?.icon_image_small || null;

    // Fetch upgrades/items
    const upgradesRes = await axios.get('https://assets.deadlock-api.com/v2/items/by-type/upgrade');
    const upgrades = upgradesRes.data;

    // Group items by category
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

    // Create embeds per category
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

    // Send first page with navigation buttons. I HATE PAGINATION!!!
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
});

client.login(token);
