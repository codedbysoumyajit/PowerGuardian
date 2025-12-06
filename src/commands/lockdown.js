const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

      const confirmEmbed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`${emojis.warning || "⚠️"} Confirm Lockdown`)
        .setDescription(
          query
            ? `Are you sure you want to lock **${channels.size}** channel(s) containing \`${query}\`?`
            : `Are you sure you want to lock **ALL (${channels.size})** channels in the server?`
        )
        .setFooter({ text: embeds.footer })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("lockdown_confirm")
          .setLabel("Confirm")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("lockdown_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.editReply({
        embeds: [confirmEmbed],
        components: [row],
      });

      const collector = msg.createMessageComponentCollector({
        time: 15000, // 15s to respond
      });

      collector.on("collect", async i => {
        // Only command invoker can interact
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: `${emojis.cross} You cannot use these buttons.`,
            ephemeral: true,
          });
        }

        // Cancel
        if (i.customId === "lockdown_cancel") {
          collector.stop();
          return i.update({
            content: `${emojis.tic} Lockdown cancelled.`,
            embeds: [],
            components: [],
          });
        }

        // Confirm
        if (i.customId === "lockdown_confirm") {
          let lockedCount = 0;

          for (const channel of channels.values()) {
            const perms = channel.permissionsFor(everyoneRole);
            // Skip if already locked
            if (perms && !perms.has(PermissionFlagsBits.SendMessages)) continue;

            await channel.permissionOverwrites
              .edit(everyoneRole, {
                SendMessages: false,
                AddReactions: false,
              })
              .then(() => lockedCount++)
              .catch(() => {});
          }

          const doneEmbed = new EmbedBuilder()
            .setColor(embeds.color)
            .setTitle(`${emojis.lock || "🔒"} Server Lockdown`)
            .setDescription(
              query
                ? `Locked **${lockedCount}** channel(s) containing \`${query}\`.`
                : `Locked **${lockedCount}** channel(s) in the server.`
            )
            .setFooter({ text: embeds.footer })
            .setTimestamp();

          await i.update({
            embeds: [doneEmbed],
            components: [],
            content: "",
          });

          // --- Send to modlogs ---
          const settings = db.table(`guild_${interaction.guild.id}`);
          const modlogs = await settings.get(`modlogs`);

          if (modlogs) {
            const log = interaction.guild.channels.cache.get(modlogs);
            if (log) await log.send({ embeds: [doneEmbed] });
          }

          collector.stop();
        }
      });

      // Auto-cancel on timeout if no interaction
      collector.on("end", async collected => {
        if (collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor(embeds.color)
            .setTitle(`${emojis.timeout} Action Timed Out`)
            .setDescription("No response received. Action has been automatically cancelled.")
            .setFooter({ text: embeds.footer })
            .setTimestamp();

          await msg
            .edit({
              embeds: [timeoutEmbed],
              components: [],
              content: "",
            })
            .catch(() => {});

          setTimeout(() => {
            msg.delete().catch(() => {});
          }, 5000);
        }
      });
    } catch (error) {
      console.error(error);
      interaction
        .editReply({
          content: `**${emojis.cross || "❌"} Lockdown failed. Make sure I have \`Manage Channels\` permission.**`,
          embeds: [],
          components: [],
        })
        .catch(() => {});
    }
  },
};