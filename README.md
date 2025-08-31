# Botlock

**Botlock** is a Discord bot that interacts with the Deadlock API to fetch hero builds, display detailed items, and more.

## Features

* Fetches hero builds by ID from the Deadlock API.
* Displays build name, version, and associated hero.
* Shows detailed items for the build, grouped by category.
* Includes item cost and tier.
* Displays an image of the hero.

## Commands

### `!build <buildId>`

Fetch and display a build with its hero and items.

**Example:**

```
!build 302546
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
!hero Infernus
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
!build 302546
```

**Result:**

<img width="621" height="619" alt="Screenshot 2025-08-31 162956" src="https://github.com/user-attachments/assets/1fde16ac-e732-4ec4-b08f-8bed85483eca" />

*Embed showing hero, build name, version, and items grouped by category.*

### Look up Hero Stats

Command:

```
!hero Victor
```

**Result:**
<img width="558" height="282" alt="image" src="https://github.com/user-attachments/assets/e74f6d46-0e43-4b0f-a2cd-c3fc9c15f96d" />

*Embed showing hero and their stats.**

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


