---

# Botlock

**Botlock** is a Discord bot that interacts with Deadlock API to do a myriad of things.
## Features

* Fetches hero builds by ID from the Deadlock API.
* Displays build name, version, and associated hero.
* Shows detailed items for the build, grouped by category.
* Includes item cost and tier.
  
## Commands

### `!build <buildId>`

Fetch and display a build with its hero and items.

**Example:**

```
!build [BUILDIDNUMBER]
```

The bot will respond with an embed including:

* Character
* Build Name
* Build Version
* Item Group(s) with items, cost, and tier
* An image of the Character

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

3. **Create a `.env` file** with your Discord bot token and Client ID:

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
