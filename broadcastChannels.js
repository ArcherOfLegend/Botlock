import { readFileSync, writeFileSync, existsSync } from 'fs';

const dataFile = 'broadcastChannels.json';
let broadcastChannels = new Map();

// Load data on startup
if (existsSync(dataFile)) {
  try {
    const raw = readFileSync(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);
    broadcastChannels = new Map(Object.entries(parsed));
  } catch (err) {
    console.error("Failed to load broadcastChannels.json:", err);
  }
}

// Save helper
function save() {
  try {
    const obj = Object.fromEntries(broadcastChannels);
    writeFileSync(dataFile, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error("Failed to save broadcastChannels.json:", err);
  }
}

// Public API
export function setChannel(guildId, channelId) {
  broadcastChannels.set(guildId, channelId);
  save();
}

export function getChannel(guildId) {
  return broadcastChannels.get(guildId);
}

export function deleteChannel(guildId) {
  broadcastChannels.delete(guildId);
  save();
}

export function getAllChannels() {
  return broadcastChannels;
}
