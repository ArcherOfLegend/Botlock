# Botlock

**Botlock** is a Discord bot that interacts with the Deadlock API to fetch hero builds, display detailed items, and more.

## Features

* Fetches hero builds by ID from the Deadlock API.
* Displays build name, version, and associated hero.
* Shows detailed items for the build, grouped by category.
* Includes item cost and tier.
* Displays an image of the hero.

## Commands

### `/build <buildId>`

Fetch and display a build with its hero and items.

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

### `!hero <heroName>`

Fetch and display detailed statistics for a specific hero.

**Example:**

```
/hero Infernus
```

**Stats displayed:**

* Pick Rate – Percentage of matches the hero is picked in.
* Win Rate – Percentage of matches the hero wins.
* Avg Kills / Deaths / Assists – Average per match.
* Avg Souls Per Minute – Derived from total souls across matches.
* Includes hero image in the embed.

---

## Usage / Screenshots

Here’s how **Botlock** looks in action:

### Fetch a Build

Command:

```
/build [build number]
```

**Result:**

![Discord_54gItyY43J](https://github.com/user-attachments/assets/f01d627d-7166-46ef-9206-639fc698f0a6)

*Embed showing hero, build name, version, and items grouped by category.*

### Look up Hero Stats

Command:

```
/hero [hero name]
```

**Result:**

![Discord_acSPWaZyfa](https://github.com/user-attachments/assets/580d3b56-291e-444e-a770-6c8026ec8364)

*Embed showing hero and their stats.*

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


