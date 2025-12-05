# PowerGuardian Discord Bot

## Overview
PowerGuardian is a Discord moderation and utility bot built with Discord.js v14. It provides various moderation commands, server management tools, and utility features including AI integration with Google Gemini and weather information.

## Project Structure
- `src/index.js` - Main bot entry point
- `src/commands/` - Slash command definitions
- `src/events/` - Discord event handlers
- `src/handlers/` - Command and alert handlers
- `src/plugins/` - Additional plugins (securegate)
- `src/database/` - Database connection setup
- `config/` - Configuration files

## Technology Stack
- **Runtime**: Node.js 20
- **Discord Library**: Discord.js v14.13.0
- **Database**: Quick.db (SQLite by default, MySQL optional)
- **AI Integration**: Google Generative AI
- **Additional APIs**: WeatherStack for weather data

## Configuration
The bot requires two configuration files in the `config/` directory:
1. `config.json` - Main bot configuration including tokens, IDs, and settings
2. `emojis.json` - Custom emoji mappings for bot responses

### Required Secrets
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_GUILD_ID` - Discord server (guild) ID for testing
- `GEMINI_API_KEY` - Google Gemini API key (optional)
- `WEATHERSTACK_API_KEY` - WeatherStack API key (optional)

## Database
By default, the bot uses SQLite (better-sqlite3 + quick.db) with the database file stored at `src/database/database.sqlite`. MySQL can be enabled by setting `settings.mysql: true` in config.json.

## Commands Available
- Moderation: ban, kick, timeout, warn, unban, lock, unlock, slowmode
- User Management: addrole, removerole, userinfo, warnings, resetwarn
- Server: serverinfo, modlogs, securegate
- Utility: ping, calculate, weather, worldclock, askGemini
- Admin: eval (for bot administrators)

## Running the Bot
1. Configure secrets in Replit Secrets
2. Run `npm run deploy` to register slash commands with Discord
3. Start the bot with `npm start`

## Recent Changes
- **2025-12-05**: Initial import and Replit environment setup
  - Created config files from examples
  - Documented project structure and requirements
  - Configured workflow for bot execution
