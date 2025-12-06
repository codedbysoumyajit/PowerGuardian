const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription(`Configure modlogs channel`)
    .addSubcommand(subcommand =>
      subcommand
        .setName("set")
        .setDescription("Set a channel for modlogs")
        .addChannelOption(option =>
          option
            .setName("logging_channel")
            .setDescription("channel for the modlogs"),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand.setName("disable").setDescription("Disable Modlogs"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction, client) {
    const db = require("./../database/connect.js");
    const settings = db.table(`guild_${interaction.guild.id}`);

    // -------------------- SET --------------------
    if (interaction.options.getSubcommand() === "set") {
      const channel = interaction.options.getChannel("logging_channel");

      await settings.set(`modlogs`, channel.id);

      const embed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`${emojis.tic} ModLogs Enabled`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          {
            name: `${emojis.reason || "📜"} Logging Channel`,
            value: `${channel}`,
            inline: false,
          },
          {
            name: `${emojis.mod || "🛡️"} Configured By`,
            value: `${interaction.user}`,
            inline: false,
          },
        )
        .setFooter({ text: embeds.footer })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // -------------------- DISABLE --------------------
    if (interaction.options.getSubcommand() === "disable") {
      await settings.set(`modlogs`, "");

      const embed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`${emojis.warning || "⚠️"} ModLogs Disabled`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          {
            name: `${emojis.mod || "🛡️"} Action By`,
            value: `${interaction.user}`,
            inline: false,
          },
          {
            name: `${emojis.cross || "❌"} Status`,
            value: `ModLogs system is now **disabled**.`,
            inline: false,
          },
        )
        .setFooter({ text: embeds.footer })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};