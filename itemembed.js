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
        const cleanText = attr.loc_string.replace(/<[^>]+>/g, "").trim();
        return cleanText || null;
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

      const text = `+${prop.value}${prop.postfix || ""} ${prop.label}`;
      return isBold ? `**${text}**` : text;
    })
    .filter(Boolean);
}

// Build content for one attribute
function buildAttributeContent(item, attr, descriptionText) {
  const lineParts = [];
  // Important
  lineParts.push(
    ...buildPropertyContent(item, attr.important_properties, true)
  );
  // Normal
  lineParts.push(
    ...buildPropertyContent(item, attr.properties, false)
  );
  // Elevated
  lineParts.push(
    ...buildPropertyContent(item, attr.elevated_properties, true)
  );
  const parts = [];
  if (lineParts.length) {
    parts.push(lineParts.join("   "));
  }
  // loc_string (skip if identical to descriptionText)
  if (attr.loc_string) {
    const text = attr.loc_string.replace(/<[^>]+>/g, "");
    if (text !== descriptionText) {
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
    if (!sectionLabel || !section.section_attributes) continue;

    const sectionContent = section.section_attributes
      .map((attr) => buildAttributeContent(item, attr, descriptionText))
      .flat()
      .filter(Boolean);

    if (sectionContent.length) {
      embed.addFields({
        name: sectionLabel,
        value: sectionContent.join("\n"),
      });
    }
  }
}

export function buildItemEmbed(item) {
  const embed = new EmbedBuilder()
    .setTitle(`${item.name} ($${item.cost})`)
    .setThumbnail(item.shop_image)
    .setColor(0xffd700);

  const descriptionText = getDescriptionFromSections(item);

  if (descriptionText) {
    embed.addFields({ name: "Description", value: descriptionText });
  }

  if (item.item_slot_type) {
    const typeName = capitalize(item.item_slot_type);
    const emoji = emojiMap[item.item_slot_type.toLowerCase()] || "";

    embed.addFields({
      name: "Type",
      value: `${emoji} ${typeName}`,
      inline: true,
    });
  }

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

  addTooltipSections(embed, item, descriptionText);

  return embed;
}