const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");


module.exports = {
  data: new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Lock all channels or channels that contain a specific name")
    .addStringOption(option =>
      option
        .setName("channel")
        .setDescription("Lock only channels whose name contains this text")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, client) {
    const db = require("./../database/connect.js");
    try {
      const query = interaction.options.getString("channel");
      const everyoneRole = interaction.guild.roles.everyone;

      let channels = interaction.guild.channels.cache.filter(ch =>
        [
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum,
        ].includes(ch.type)
      );

      if (query) {
        const q = query.toLowerCase();
        channels = channels.filter(ch => ch.name.toLowerCase().includes(q));
      }

      if (!channels.size) {
        return interaction.editReply({
          content: `**${emojis.cross || "❌"} No channels found${query ? ` containing \`${query}\`` : ""}.**`,
        });
      }

      let lockedCount = 0;
      for (const channel of channels.values()) {
        const perms = channel.permissionsFor(everyoneRole);
        if (perms && !perms.has(PermissionFlagsBits.SendMessages)) continue;

        await channel.permissionOverwrites
          .edit(everyoneRole, {
            SendMessages: false,
            AddReactions: false,
          })
          .then(() => lockedCount++)
          .catch(() => {});
      }

      const embed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`${emojis.lock || "🔒"} Server Lockdown`)
        .setDescription(
          query
            ? `Locked **${lockedCount}** channel(s) whose name contains \`${query}\`.`
            : `Locked **${lockedCount}** channel(s) in the server.`
        )
        .setFooter({ text: embeds.footer })
        .setTimestamp();

      const msg = await interaction.editReply({ embeds: [embed] });

      // ✅ --- Send to modlogs ---
      const settings = db.table(`guild_${interaction.guild.id}`);
      const modlogs = await settings.get(`modlogs`);

      if (!modlogs) return;

      const log = interaction.guild.channels.cache.get(modlogs);
      if (!log) return;

      await log.send({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: `**${emojis.cross || "❌"} I couldn't lock the channels. Make sure I have \`Manage Channels\` permission.**`,
      });
    }
  },
};