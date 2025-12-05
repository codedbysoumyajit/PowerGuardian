# PowerGuardian Discord Bot

## Overview

PowerGuardian is a Discord moderation and utility bot built with Discord.js v14. The bot provides comprehensive server management features including moderation tools, security systems, utility commands, and third-party integrations for weather and AI assistance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure

**Command-Based Architecture**
- Utilizes Discord.js slash command system for all user interactions
- Commands are loaded dynamically from the `/src/commands` directory at startup
- Each command is a self-contained module with its own data structure and execution logic
- Command deployment can be configured for global or guild-specific registration via `deploy-commands.js`

**Event-Driven System**
- Event handlers are loaded from `/src/events` directory
- Supports both one-time (`once`) and recurring event listeners
- Core events include `ready` (bot initialization) and `interactionCreate` (command handling)

**Plugin System**
- Modular plugin architecture in `/src/plugins` for extended functionality
- Plugins like `securegate` provide automated security features that run independently of commands
- Plugins hook into Discord events (e.g., `guildMemberAdd`) for real-time monitoring

### Data Persistence

**Quick.DB with Dual Storage Support**
- Primary database solution using Quick.DB library
- **SQLite Mode (Default)**: Uses better-sqlite3 for local file storage at `./src/database/database.sqlite`
- **MySQL Mode (Optional)**: Supports MySQL via mysql2 driver for production/multi-instance deployments
- Storage mode is configured via `config.settings.mysql` boolean flag
- Database connection abstraction in `/src/database/connect.js` allows seamless switching between storage backends

**Data Organization**
- Guild-specific data stored in tables named `guild_{guildId}`
- Per-guild settings include: modlogs channel, securegate status, slowmode configuration
- Per-user data (warnings) stored under user ID keys within guild tables

### Configuration Management

**JSON-Based Configuration**
- All configuration stored in `/config` directory
- **config.json**: Bot credentials, feature flags, admin IDs, database settings
- **embeds.json**: Global embed styling (color, footer)
- **emojis.json**: Custom emoji mappings for consistent UI across commands
- Separation of example configs (`example-config.json`) from active configs for security

**Feature Flags**
- `maintenance`: Restricts bot usage to admin users only
- `globalCommands`: Toggles between global vs guild-specific command deployment
- `antiCrash`: Enables/disables crash handler
- `mysql`: Switches database backend

### Handler System

**Three Core Handlers**
1. **Commands Handler** (`/src/handlers/commands.js`)
   - Processes slash command interactions
   - Enforces maintenance mode restrictions
   - Implements deferred reply pattern for all commands
   - Centralized error handling and logging

2. **Alert Handler** (`/src/handlers/alert.js`)
   - Monitors bot lifecycle events (guild join/leave, errors)
   - Sends notifications to configured channels
   - Uses channel IDs from config (errorId, joinId, leftId)

3. **AntiCrash Handler** (`/src/handlers/antiCrash.js`)
   - Optional crash prevention system
   - Catches unhandled rejections and exceptions
   - Prevents bot downtime from uncaught errors

### Security Features

**SecureGate Plugin**
- Automated security system for new member screening
- Detection criteria:
  - Unverified Discord accounts
  - Invite links in usernames (regex-based detection)
  - Account age < 5 days
  - Unverified bots
  - Rapid privilege escalation (admin permissions within 1 minute)
- Actions are logged to configured modlogs channel
- Can be enabled/disabled per-guild via slash command

**Permission System**
- Commands use Discord's built-in permission flags (e.g., `BanMembers`, `ManageChannels`)
- Admin-only commands (like `eval`) check against `config.settings.admin` array
- Role hierarchy validation for moderation actions

### Moderation System

**Action Tracking**
- Moderation actions logged to per-guild modlogs channel
- Logs include: moderator, reason, target user, timestamp
- Warning system with persistent storage in Quick.DB
- Supports: ban, kick, timeout, warn, unban operations

**Embed-Based Responses**
- Consistent embed formatting across all commands
- Custom emoji integration for visual feedback
- Standardized color scheme and footer from config

## External Dependencies

### Discord Integration
- **discord.js v14.13.0**: Primary Discord API wrapper
  - Uses Gateway intents: Guilds, GuildMembers
  - Slash command implementation via REST API
  - Event-driven architecture for real-time updates

### Third-Party APIs

**Google Gemini AI**
- Library: `@google/generative-ai v0.1.3`
- Model: `gemini-pro`
- Usage: `/askgemini` command for AI-powered question answering
- API key stored in `config.bot.GEMINI_API_KEY`

**WeatherStack API**
- Library: `axios v1.5.0` for HTTP requests
- Endpoint: `http://api.weatherstack.com/current`
- Usage: `/weather` command provides real-time weather data
- Returns: temperature, weather descriptions, UV index, humidity, wind speed, visibility
- API key stored in `config.bot.WEATHERSTACK_API_KEY`

### Utility Libraries

**Time and Date**
- `moment-timezone v0.5.43`: Timezone conversions for `/worldclock` command
- Displays current time across G20 countries with flag emojis

**String Processing**
- `ms v2.1.3`: Duration parsing for timeout/slowmode commands
- Converts human-readable durations (e.g., "5m", "1h") to milliseconds

**HTTP Client**
- `axios v1.5.0`: Primary HTTP client for external API calls
- `node-fetch v3.3.2`: Alternative fetch implementation

### Database Drivers
- `better-sqlite3 v8.6.0`: High-performance SQLite3 driver for local storage
- `mysql2 v3.6.1`: MySQL client for production database connectivity
- `quick.db v9.1.7`: Key-value database abstraction layer with driver support