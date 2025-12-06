const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const embeds = require("./../../config/embeds.json");
const emojis = require("./../../config/emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(embeds.color)
      .setTitle(`**${embeds.footer} Status:**`)
      .addFields({
        name: `${emojis.latency} Gateway Latency:`,
        value: `${interaction.client.ws.ping}ms`,
        inline: false,
      })
      .setFooter({ text: `${embeds.footer}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
