// registerCommand.js
import { SlashCommandBuilder } from "discord.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const dataFile = "steamRegistrations.json";
let steamRegistrations = new Map(); // { discordId: steamId }

// Load existing registrations
if (existsSync(dataFile)) {
  try {
    const raw = readFileSync(dataFile, "utf-8");
    const parsed = JSON.parse(raw);
    steamRegistrations = new Map(Object.entries(parsed));
  } catch (err) {
    console.error("Failed to load steamRegistrations.json:", err);
  }
}

// Save to file
function saveRegistrations() {
  try {
    const obj = Object.fromEntries(steamRegistrations);
    writeFileSync(dataFile, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error("Failed to save steamRegistrations.json:", err);
  }
}

// Helpers for other files (authServer.js will use these)
export function setSteamId(discordId, steamId) {
  steamRegistrations.set(discordId, steamId);
  saveRegistrations();
}

export function getSteamId(discordId) {
  return steamRegistrations.get(discordId);
}

export function getAllRegistrations() {
  return steamRegistrations;
}

// Slash command definition
export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Link your Steam account to your Discord account");

// Slash command execution
export async function execute(interaction) {
  const discordId = interaction.user.id;
  // This URL must match your authServer.js config
  const registerUrl = `http://localhost:3000/auth/steam?discordId=${discordId}`;

  await interaction.reply({
    content: `🔗 Click here to link your Steam account: [Login with Steam](${registerUrl})`,
    ephemeral: true,
  });
}
