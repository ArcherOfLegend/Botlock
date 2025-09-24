import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REG_FILE = path.join(__dirname, "id_reg.json");

class UserRegistry {
  constructor() {
    this.registeredIds = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(REG_FILE)) {
        const raw = fs.readFileSync(REG_FILE, "utf-8");
        this.registeredIds = JSON.parse(raw);
      } else {
        this.registeredIds = {};
        this.save();
      }
    } catch (err) {
      console.error("Error loading registry:", err);
      this.registeredIds = {};
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(REG_FILE, JSON.stringify(this.registeredIds, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving registry:", err);
    }
  }

  register(discordId, steamId) {
    this.registeredIds[discordId] = steamId;
    this.save();
  }

  unregister(discordId) {
    delete this.registeredIds[discordId];
    this.save();
  }

  isRegistered(discordId) {
    return Object.prototype.hasOwnProperty.call(this.registeredIds, discordId);
  }

  get(discordId) {
    return this.registeredIds[discordId] || null;
  }
}

export const REGISTRY = new UserRegistry();
