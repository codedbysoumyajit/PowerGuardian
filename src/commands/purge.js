const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a specific number of messages")
    .addIntegerOption(option =>
      option
        .setName("count")
        .setDescription("Number of messages to delete")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, client) {
    const db = require("./../database/connect.js");
    try {
      const count = interaction.options.getInteger("count");
      const channel = interaction.channel;

      // First reply (your handler has already deferReply()'d)
      const initialMsg = await interaction.editReply({
        content: `${emojis.loading || "⏳"} Deleting ${count} messages...`,
      });

      // Fetch messages INCLUDING this reply, then exclude it
      const fetched = await channel.messages.fetch({ limit: count + 1 });

      const toDelete = fetched
        .filter(m => m.id !== initialMsg.id) // don't delete the interaction reply
        .first(count);

      const deleted = await channel.bulkDelete(toDelete, true);

      const embed = new EmbedBuilder()
        .setColor(embeds.color)
        .setTitle(`${emojis.garbage} Messages Purged`)
        .addFields({
          name: "Deleted Messages:",
          value: `${emojis.tic || "✅"} ${deleted.size} messages deleted successfully.`,
          inline: false,
        })
        .setFooter({ text: `${embeds.footer}` })
        .setTimestamp();

      // Update the reply with the final embed
      const msg = await interaction.editReply({ content: "", embeds: [embed] });

// --- Send to modlogs ---
      const settings = db.table(`guild_${interaction.guild.id}`);
      const modlogs = await settings.get(`modlogs`);

      if (!modlogs) return;

      const log = interaction.guild.channels.cache.get(modlogs);
      if (!log) return;

      await log.send({ embeds: [embed] });

      
      // Auto delete that reply after 5s
      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 5000);

    } catch (error) {
      console.error(error);
      // Just edit the reply; don't use ephemeral here
      interaction.editReply({
        content: `**I Can't Purge Messages, Maybe I Don't Have Permission Or Messages Are Too Old!**`,
      }).catch(() => {});
    }
  },
};