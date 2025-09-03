import { EmbedBuilder } from "discord.js";

// Capitalize helper
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildItemEmbed(item) {
  const embed = new EmbedBuilder()
    .setTitle(`${item.name} ($${item.cost})`)
    .setThumbnail(item.shop_image)
    .setColor(0xffd700);

  const descriptionText = item.description?.desc?.replace(/<[^>]+>/g, "");

  // Show general description if available
  if (descriptionText) {
    embed.addFields({
      name: "Description",
      value: descriptionText,
    });
  }

  // Item type
  if (item.item_slot_type) {
    embed.addFields({
      name: "Type",
      value: capitalize(item.item_slot_type),
      inline: true,
    });
  }

  // Activation / passive
  if (item.activation) {
    const activationText = ["instant_cast", "press"].includes(item.activation.toLowerCase())
      ? "Active"
      // heeadache
      : capitalize(item.activation);

    embed.addFields({
      name: "Activation",
      value: activationText,
      inline: true,
    });
  }

  // Tooltip sections
  if (item.tooltip_sections?.length) {
    item.tooltip_sections.forEach((section) => {
      const sectionLabel = capitalize(section?.section_type);
      const sectionContent = [];

      if (section.section_attributes) {
        section.section_attributes.forEach((attr) => {
          // Important properties first (bold)
          if (attr.important_properties?.length) {
            attr.important_properties.forEach((propKey) => {
              const prop = item.properties?.[propKey];
              if (prop) {
                sectionContent.push(
                  `**+${prop.value}${prop.postfix || ""} ${prop.label}**`
                );
              }
            });
          }

          // Normal properties
          if (attr.properties?.length) {
            attr.properties.forEach((propKey) => {
              const prop = item.properties?.[propKey];
              if (prop) {
                sectionContent.push(
                  `+${prop.value}${prop.postfix || ""} ${prop.label}`
                );
              }
            });
          }

          // Elevated properties
          if (attr.elevated_properties?.length) {
            attr.elevated_properties.forEach((propKey) => {
              const prop = item.properties?.[propKey];
              if (prop) {
                sectionContent.push(
                  `**+${prop.value}${prop.postfix || ""} ${prop.label}**`
                );
              }
            });
          }

          // loc_string (only if different from main description)
          if (attr.loc_string) {
            const text = attr.loc_string.replace(/<[^>]+>/g, "");
            if (text !== descriptionText) {
              sectionContent.push(text);
            }
          }
        });
      }

      if (sectionContent.length && sectionLabel) {
        embed.addFields({
          name: sectionLabel,
          value: sectionContent.join("\n"),
        });
      }
    });
  }

  return embed;
}
