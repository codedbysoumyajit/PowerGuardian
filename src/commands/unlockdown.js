const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");
const db = require("./../database/connect.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlockdown")
    .setDescription("Unlock all channels or channels that contain a specific name")
    .addStringOption(option =>
      option
        .setName("channel")
        .setDescription("Unlock only channels whose name contains this text")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    try {
      const query = interaction.options.getString("channel");
      const everyoneRole = interaction.guild.roles.everyone;

      // Get all text-based guild channels
      let channels = interaction.guild.channels.cache.filter(ch =>
        [
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum,
        ].includes(ch.type)
      );

      // Filter by name if query given
      if (query) {
        const q = query.toLowerCase();
        channels = channels.filter(ch => ch.name.toLowerCase().includes(q));
      }

      if (!channels.size) {
        return interaction.editReply({
          content: `**${emojis.cross || "❌"} No channels found${
            query ? ` containing \`${query}\`` : ""
          }.**`,
        });
      }

      let unlockedCount = 0;
      for (const channel of channels.values()) {
        const overwrite = channel.permissionOverwrites.cache.get(
          everyoneRole.id
        );

        // If no overwrite for everyone, nothing to unlock here
        if (!overwrite) continue;

        await channel.permissionOverwrites
          .edit(everyoneRole, {
            SendMessages: null,
            AddReactions: null,
          })
          .then(() => unlockedCount++)
          .catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`${emojis.unlock || "🔓"} Server Unlockdown`)
        .setDescription(
          query
            ? `Unlocked **${unlockedCount}** channel(s) whose name contains \`${query}\`.`
            : `Unlocked **${unlockedCount}** channel(s) in the server.`
        )
        .setFooter({ text: embeds.footer })
        .setTimestamp();

      const msg = await interaction.editReply({ embeds: [embed] });

      // Auto delete confirmation after 5 seconds
      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 5000);

      // --- Send to modlogs ---
      const settings = db.table(`guild_${interaction.guild.id}`);
      const modlogs = await settings.get(`modlogs`);

      if (!modlogs) return;

      const log = interaction.guild.channels.cache.get(modlogs);
      if (!log) return;

      await log.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: `**${emojis.cross || "❌"} I couldn't unlock the channels. Make sure I have \`Manage Channels\` permission.**`,
      });
    }
  },
};