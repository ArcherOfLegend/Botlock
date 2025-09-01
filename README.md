# Botlock

**Botlock** is a Discord bot that interacts with the Deadlock API to fetch character builds, display detailed items, and more.

## Features

* Fetches character builds by ID from the Deadlock API.
* Shows detailed item descriptions.
* Preview average character stats.

## Commands

### `/build <buildId>`

Fetch and display a build with its character and items.

**Example:**

```
/build 302546
```

The bot will respond with an embed including:

* Character
* Build Name
* Build Version
* Item Group(s) with items, cost, and tier
* An image of the character

### `/hero <heroName>`

Fetch and display detailed statistics for a specific character.

**Example:**

```
/hero Infernus
```

**Stats displayed:**

* Pick Rate – Percentage of matches the character is picked in.
* Win Rate – Percentage of matches the character wins.
* Avg Kills / Deaths / Assists – Average per match.
* Avg Souls Per Minute – Derived from total souls across matches.
* Includes character image in the embed.

### `/item <itemName>`

Fetch and display an item's information.

**Example:**

```
/item Cold Front
```

**Info Shown:**

* Item name
* Cost
* Description
* Type
* Activation
* Base Stats
* Item-Specific Passive Stats
* Item-Specific Active Stats

---

## Usage / Screenshots

Here’s how **Botlock** looks in action:

### Fetch a Build

Command:

```
/build [build number]
```

**Result:**

![Discord_oF7D7WchHe](https://github.com/user-attachments/assets/97bc940d-4a0b-4e3a-abba-1a77648ebc20)

*Embed showing character, build name, version, and items grouped by category.*

### Look up Character Stats

Command:

```
/hero [hero name]
```

**Result:**

![Discord_WFCIKM6Vo4](https://github.com/user-attachments/assets/92548863-2cdd-4663-b235-180067345939)

*Embed showing character and their stats.*

Command:

```
/item [item name]
```

**Result:**

![Discord_ekoojtOoaU](https://github.com/user-attachments/assets/71c85037-91e7-4f4c-926a-fcf431825521)

*Embed showing item name, cost, activiation, etc.*

---

## Setup

1. **Clone the repository:**

```bash
git clone https://github.com/HadiNasser1/Botlock.git
cd Botlock
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create a `.env` file** with your Discord bot token and client ID:

```
BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
CLIENT_ID=YOUR_CLIENT_ID_HERE
```

4. **Run the bot:**

```bash
node index.js
```

> Ensure your bot has the required intents enabled: `Guilds`, `GuildMessages`, `MessageContent`.

## Dependencies

* [discord.js](https://www.npmjs.com/package/discord.js) – For interacting with the Discord API.
* [axios](https://www.npmjs.com/package/axios) – For making HTTP requests to the Deadlock API.
* [dotenv](https://www.npmjs.com/package/dotenv) – For managing environment variables.

## API References

* Deadlock Builds: `https://api.deadlock-api.com/v1/builds`
* Deadlock Items: `https://assets.deadlock-api.com/v2/items/by-type/upgrade`
* Deadlock Heroes: `https://assets.deadlock-api.com/v2/heroes`

## Contributing

Feel free to fork the repository, make improvements, and submit pull requests.

## License

MIT License © Hadi Nasser

---


