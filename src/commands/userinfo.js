const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user.")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to get information about"),
    ),

  async execute(interaction) {
    const { options, guild } = interaction;
    const userToGetInfo = options.getUser("user") || interaction.user;
    const memberToGetInfo = guild.members.cache.get(userToGetInfo.id);

    // Basic
    const userID = userToGetInfo.id;
    const userTag = userToGetInfo.tag || `${userToGetInfo.username}`;
    const nickname = memberToGetInfo?.nickname || "None";
    const isBot = userToGetInfo.bot ? "Yes 🤖" : "No 🧒";

    // Roles (ignore @everyone)
    let roles = "None";
    let highestRole = "None";
    let roleCount = 0;

    if (memberToGetInfo) {
      const roleCache = memberToGetInfo.roles.cache
        .filter((role) => role.id !== guild.id)
        .sort((a, b) => b.position - a.position);

      roleCount = roleCache.size;
      highestRole = roleCache.first() ? `${roleCache.first()}` : "None";
      roles = roleCache.map((role) => `${role}`).join(", ") || "None";

      // Trim roles if it's too long for embed field
      if (roles.length > 1000) {
        roles = roles.slice(0, 1000) + ` ... and more (${roleCount} roles total)`;
      }
    }

    // Dates & relative time
    const createdTimestamp = Math.floor(userToGetInfo.createdTimestamp / 1000);
    const discordJoinedDate = `<t:${createdTimestamp}:F>\n<t:${createdTimestamp}:R>`;

    const serverJoinedDate = memberToGetInfo?.joinedTimestamp
      ? (() => {
          const joinedTimestamp = Math.floor(
            memberToGetInfo.joinedTimestamp / 1000,
          );
          return `<t:${joinedTimestamp}:F>\n<t:${joinedTimestamp}:R>`;
        })()
      : "Not in this server";

    // Presence / status
    const status =
      memberToGetInfo?.presence?.status || "Offline / Invisible";

    // Boosting
    const boosting =
      memberToGetInfo?.premiumSince &&
      memberToGetInfo.premiumSinceTimestamp
        ? `<t:${Math.floor(memberToGetInfo.premiumSinceTimestamp / 1000)}:R>`
        : "Not boosting";

    // Avatar
    const avatarURL = userToGetInfo.displayAvatarURL({
      dynamic: true,
      size: 1024,
    });

    const embed = new EmbedBuilder()
      .setColor(embeds.color)
      .setAuthor({
        name: `${userTag}`,
        iconURL: avatarURL,
      })
      .setTitle(`Information of ${userToGetInfo.username}`)
      .setThumbnail(avatarURL)
      .addFields(
        {
          name: `${emojis.id || "🆔"} User ID`,
          value: `\`${userID}\``,
          inline: true,
        },
        {
          name: `${emojis.mention || "👤"} Mention`,
          value: `${userToGetInfo}`,
          inline: true,
        },
        {
          name: `${emojis.bot || "🤖"} Bot`,
          value: `${isBot}`,
          inline: true,
        },
        {
          name: `${emojis.nickname || "🏷️"} Nickname`,
          value: `${nickname}`,
          inline: true,
        },
        {
          name: `${emojis.role || "📛"} Highest Role`,
          value: `${highestRole}`,
          inline: true,
        },
        {
          name: `${emojis.role || "📛"} Role Count`,
          value: `\`${roleCount}\``,
          inline: true,
        },
        {
          name: `${emojis.online || "💡"} Status`,
          value: `\`${status}\``,
          inline: true,
        },
        {
          name: `${emojis.birthday || "📅"} Discord Joined`,
          value: `${discordJoinedDate}`,
          inline: false,
        },
        {
          name: `${emojis.birthday || "📅"} Server Joined`,
          value: `${serverJoinedDate}`,
          inline: false,
        },
        {
          name: `${emojis.boost || "🚀"} Boosting`,
          value: `${boosting}`,
          inline: false,
        },
        {
          name: `${emojis.role || "📜"} Roles`,
          value: `${roles}`,
          inline: false,
        },
      )
      .setFooter({ text: `${embeds.footer}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};