const {
  UserFlags,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const db = require("./../database/connect.js");
    const settings = db.table(`guild_${member.guild.id}`);
    const securegate = await settings.get(`securegate`);

    if (securegate !== "enabled") return;

    const guild = member.guild;
    const modlogs = await settings.get(`modlogs`);

    // --- CONFIG ---
    const MIN_ACCOUNT_AGE_DAYS = 5;
    const MIN_ACCOUNT_AGE_MS = MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;

    const USERNAME_INVITE_REGEX =
      /(discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9]+)/i;
    const USERNAME_LINK_REGEX = /(https?:\/\/[^\s]+)/i;

    const SUSPICIOUS_KEYWORDS = [
      "free nitro",
      "nitro",
      "airdrop",
      "crypto",
      "pump",
      "scam",
      "steam",
      "gift",
      "giveaway",
      "discord nitro",
    ];

    // --- HELPERS ---
    const sendToModlogs = async (embed) => {
      if (isNaN(modlogs)) return;
      const log = guild.channels.cache.get(modlogs);
      if (!log) return;
      await log.send({ embeds: [embed] }).catch(() => {});
    };

    const buildKickEmbed = (reason) => {
      return new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`**Member Kicked**`)
        .addFields(
          {
            name: `${emojis.mod} Moderator:`,
            value: `SecureGate System`,
            inline: false,
          },
          {
            name: `${emojis.reason} Reason:`,
            value: reason,
            inline: false,
          },
          {
            name: `${emojis.member} Member:`,
            value: `${member.user.tag} (\`${member.id}\`)`,
            inline: false,
          },
        )
        .setFooter({ text: `${embeds.footer}` })
        .setTimestamp();
    };

    const buildWarnEmbed = (reason) => {
      return new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`**${emojis.warning} SecureGate Warning**`)
        .setDescription(reason)
        .addFields({
          name: `${emojis.member} Member:`,
          value: `${member.user.tag} (\`${member.id}\`)`,
          inline: false,
        })
        .setFooter({ text: `${embeds.footer}` })
        .setTimestamp();
    };

    const secureKick = async (reason) => {
      // If bot cannot kick (role hierarchy), send warning instead
      if (!member.kickable) {
        const warnEmbed = buildWarnEmbed(
          `${reason}\n\nI tried to remove this member automatically but I don't have enough permissions (my role is lower). Please review this user immediately.`,
        );
        await sendToModlogs(warnEmbed);
        return;
      }

      try {
        await member.kick(reason);
        const kickEmbed = buildKickEmbed(reason);
        await sendToModlogs(kickEmbed);
      } catch (error) {
        const warnEmbed = buildWarnEmbed(
          `${reason}\n\nI tried to kick this user but an error occurred. Please check my permissions and investigate this member manually.`,
        );
        await sendToModlogs(warnEmbed);
      }
    };

    // --- RULE 1: Username contains Discord invite link ---
    if (USERNAME_INVITE_REGEX.test(member.user.username)) {
      await secureKick("User joined with a Discord invite link in their username.");
      return;
    }

    // --- RULE 2: Username contains any link (http/https) ---
    if (USERNAME_LINK_REGEX.test(member.user.username)) {
      await secureKick("User joined with a URL/link in their username.");
      return;
    }

    // --- RULE 3: Username tries to mass-mention (@everyone / @here) ---
    const lowerName = member.user.username.toLowerCase();
    if (lowerName.includes("@everyone") || lowerName.includes("@here")) {
      await secureKick("User joined with mass-mention (@everyone/@here) in their username.");
      return;
    }

    // --- RULE 4: Suspicious scam/raid keywords in username ---
    const suspiciousKeyword = SUSPICIOUS_KEYWORDS.find((word) =>
      lowerName.includes(word),
    );
    if (suspiciousKeyword) {
      await secureKick(
        `User joined with suspicious keyword in username: "${suspiciousKeyword}".`,
      );
      return;
    }

    // --- RULE 5: Very young account (alt detection) ---
    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    if (accountAgeMs < MIN_ACCOUNT_AGE_MS) {
      await secureKick(
        `User account age is less than ${MIN_ACCOUNT_AGE_DAYS} days (possible alt or throwaway).`,
      );
      return;
    }

    // --- RULE 6: Unverified bot (non-verified application) ---
    if (
      member.user.bot &&
      !(member.user.flags && member.user.flags.has(UserFlags.VerifiedBot))
    ) {
      await secureKick("Unverified bot joined the server.");
      return;
    }

    // NOTE: Checking "verified email" is NOT possible through the Discord API for normal users.
    // The previous rule using `member.user.verified` was not valid and is removed.

    // --- RULE 7: Gaining ADMINISTRATOR within 1 minute of joining ---
    setTimeout(async () => {
      // If they already left / were kicked, ignore
      if (!guild.members.cache.has(member.id)) return;

      // Ignore bots here (you already have an unverified-bot rule)
      if (member.user.bot) return;

      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        await secureKick(
          "Member gained administrator permissions within one minute of joining.",
        );
      }
    }, 60_000); // 1 minute
  });
};