import { EmbedBuilder } from "discord.js";

// Capitalize helper
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Custom emoji map
const emojiMap = {
  vitality: "<:vitality:1412785828845060216>",
  spirit: "<:spirit:1412785868292358225>",
  weapon: "<:weapon:1412785897983705108>",
};

// Extract description from tooltip sections
function getDescriptionFromSections(item) {
  if (!item.tooltip_sections?.length) return "";

  return item.tooltip_sections
    .flatMap((section) =>
      section.section_attributes?.map((attr) => {
        if (!attr.loc_string) return null;
        return attr.loc_string.replace(/<[^>]+>/g, "").trim();
      }) || []
    )
    .filter(Boolean)
    .join("\n\n"); // blank line between sections
}

// Build text from property keys
function buildPropertyContent(item, propKeys, isBold = false) {
  if (!propKeys?.length) return [];
  return propKeys
    .map((key) => {
      const prop = item.properties?.[key];
      if (!prop) return null;

      let prefix = prop.prefix?.replace("{s:sign}", "") ?? "";

      // If prefix is empty and value is not zero, add "+"
      if (!prefix && prop.value && prop.value !== "0") {
        prefix = "+";
      }

      const text = `${prefix}${prop.value}${prop.postfix || ""} ${prop.label}`;
      return isBold ? `**${text}**` : text;
    })
    .filter(Boolean);
}

// Build content for one attribute
function buildAttributeContent(item, attr, descriptionText) {
  const parts = [
    ...buildPropertyContent(item, attr.important_properties, true),
    ...buildPropertyContent(item, attr.properties, false),
    ...buildPropertyContent(item, attr.elevated_properties, true),
  ];

  if (attr.loc_string) {
    const text = attr.loc_string.replace(/<[^>]+>/g, "").trim();
    if (text && text !== descriptionText) {
      parts.push(text);
    }
  }

  return parts;
}

// Add tooltip sections into embed
function addTooltipSections(embed, item, descriptionText) {
  if (!item.tooltip_sections?.length) return;

  for (const section of item.tooltip_sections) {
    const sectionLabel = capitalize(section?.section_type);
    const sectionContent = section.section_attributes
      .map((attr) => buildAttributeContent(item, attr, descriptionText))
      .flat()
      .filter(Boolean);

    if (sectionContent.length) {
      embed.addFields({
        name: sectionLabel || "Stats",
        value: sectionContent.join("\n"),
      });
    }
  }
}

// Build the full item embed
export function buildItemEmbed(item) {
  const embed = new EmbedBuilder()
    .setTitle(`${item.name} ($${item.cost})`)
    .setThumbnail(item.shop_image)
    .setColor(0xffd700);

  // Add description
  const descriptionText = getDescriptionFromSections(item);
  if (descriptionText) {
    embed.addFields({ name: "Description", value: descriptionText });
  }

  // Add type field
  if (item.item_slot_type) {
    const typeName = capitalize(item.item_slot_type);
    const emoji = emojiMap[item.item_slot_type.toLowerCase()] || "";

    embed.addFields({
      name: "Type",
      value: `${emoji} ${typeName}`,
      inline: true,
    });
  }

  // Add activation
  if (item.activation) {
    const activationText = ["instant_cast", "press"].includes(
      item.activation.toLowerCase()
    )
      ? "Active"
      : capitalize(item.activation);

    embed.addFields({
      name: "Activation",
      value: activationText,
      inline: true,
    });
  }

  // Add tooltip sections (stats)
  addTooltipSections(embed, item, descriptionText);

  return embed;
}
