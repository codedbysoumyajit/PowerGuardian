const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("securegate")
    .setDescription("Advanced server security system")
    .addSubcommand(sub =>
      sub.setName("enable").setDescription("Enable SecureGate protection"),
    )
    .addSubcommand(sub =>
      sub.setName("disable").setDescription("Disable SecureGate protection"),
    )
    .addSubcommand(sub =>
      sub.setName("status").setDescription("View SecureGate status"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction, client) {
    const db = require("./../database/connect.js");
    const settings = db.table(`guild_${interaction.guild.id}`);
    const sub = interaction.options.getSubcommand();

    // ------------------ STATUS ------------------
    if (sub === "status") {
      const state = (await settings.get("securegate")) || "disabled";

      const statusEmbed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle("🔐 SecureGate System Status")
        .setDescription(
          state === "enabled"
            ? `**${emojis.tic || "✅"} SecureGate is currently ACTIVE and protecting this server.**`
            : `**${emojis.cross || "❌"} SecureGate is currently DISABLED.**`,
        )
        .addFields(
          {
            name: "⚙️ System State",
            value: `\`${state.toUpperCase()}\``,
            inline: true,
          },
          {
            name: "🛡️ Protection Level",
            value: state === "enabled" ? "`High Security`" : "`No Protection`",
            inline: true,
          },
          {
            name: "👤 Minimum Account Age",
            value: "`5 Days`",
            inline: true,
          },
          {
            name: "🚫 Username Filters",
            value:
              "• Discord invite links\n" +
              "• Any website links (http/https)\n" +
              "• `@everyone` / `@here`\n" +
              "• Scam keywords (`nitro`, `free nitro`, `airdrop`, `crypto`, `gift`, etc.)",
            inline: false,
          },
          {
            name: "🤖 Bot Protection",
            value:
              "• Blocks **unverified bots**\n" +
              "• Allows only **Verified Discord Bots**",
            inline: false,
          },
          {
            name: "🧠 Behavior Monitoring",
            value:
              "• Detects **administrator permission gain within 1 minute** of joining\n" +
              "• Flags suspicious raid / fast-privilege behavior",
            inline: false,
          },
          {
            name: "⚡ Auto Actions",
            value:
              "• Instantly **kicks** suspicious members\n" +
              "• Sends detailed **modlog reports** for each action\n" +
              "• Sends **warning alerts** if unable to kick due to role hierarchy",
            inline: false,
          },
          {
            name: "📜 Logging",
            value:
              "• Logs all automatic actions to the configured **modlog channel**\n" +
              "• Includes reason, member info & SecureGate as the moderator",
            inline: false,
          },
          {
            name: "⚠️ Safety Handling",
            value:
              "• If the bot cannot kick a member due to **role hierarchy**, SecureGate sends a **warning embed** instead\n" +
              "• Encourages manual review by real moderators",
            inline: false,
          },
          {
            name: "🧩 Controlled By",
            value:
              "• `/securegate enable`\n" +
              "• `/securegate disable`\n" +
              "• `/securegate status`",
            inline: false,
          },
        )
        .setFooter({ text: embeds.footer })
        .setTimestamp();

      return interaction.editReply({ embeds: [statusEmbed] });
    }

    // ------------------ ENABLE / DISABLE ------------------
    const isEnabling = sub === "enable";

    const confirmEmbed = new EmbedBuilder()
      .setColor(embeds.color)
      .setTitle("⚠️ SecureGate Confirmation")
      .setDescription(
        isEnabling
          ? `Are you sure you want to **ENABLE** SecureGate?\n\n**Protection Includes:**\n` +
            "• Invite & link usernames\n" +
            "• Scam keyword detection\n" +
            "• Account age check (< 5 days)\n" +
            "• Unverified bot blocking\n" +
            "• Admin-permission abuse detection (within 1 minute)"
          : `Are you sure you want to **DISABLE** SecureGate?\n\nThis will stop all automatic protection and logging.`,
      )
      .setFooter({ text: embeds.footer })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("securegate_confirm")
        .setLabel("Confirm")
        .setStyle(isEnabling ? ButtonStyle.Success : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("securegate_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await interaction.editReply({
      embeds: [confirmEmbed],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "❌ You cannot use these buttons.",
          ephemeral: true,
        });
      }

      // Cancel
      if (i.customId === "securegate_cancel") {
        collector.stop();
        return i.update({
          content: "✅ Action cancelled.",
          embeds: [],
          components: [],
        });
      }

      // Confirm
      if (i.customId === "securegate_confirm") {
        await settings.set("securegate", isEnabling ? "enabled" : "disabled");

        const resultEmbed = new EmbedBuilder()
          .setColor(embeds.color)
          .setTitle("🔐 SecureGate Updated")
          .setDescription(
            isEnabling
              ? `**${emojis.tic || "✅"} SecureGate has been successfully ENABLED.**\nAutomatic protection is now active.`
              : `**${emojis.tic || "✅"} SecureGate has been successfully DISABLED.**\nAutomatic protection is now turned off.`,
          )
          .addFields({
            name: "Moderator",
            value: `${interaction.user} (\`${interaction.user.id}\`)`,
            inline: false,
          })
          .setFooter({ text: embeds.footer })
          .setTimestamp();

        await i.update({
          embeds: [resultEmbed],
          components: [],
          content: "",
        });

        // -------- MODLOGS --------
        const modlogs = await settings.get("modlogs");
        if (modlogs) {
          const log = interaction.guild.channels.cache.get(modlogs);
          if (log) {
            await log.send({ embeds: [resultEmbed] }).catch(() => {});
          }
        }

        collector.stop();
      }
    });

    // ------------------ TIMEOUT AUTO-CANCEL ------------------
    collector.on("end", async collected => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(embeds.color)
          .setTitle("⏱️ Timed Out")
          .setDescription("No response received. Action cancelled automatically.")
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
  },
};