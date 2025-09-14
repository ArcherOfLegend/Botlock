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

  const descriptions = [];
  for (const section of item.tooltip_sections) {
    if (!section.section_attributes) continue;

    for (const attr of section.section_attributes) {
      if (!attr.loc_string) continue;
      const cleanText = attr.loc_string.replace(/<[^>]+>/g, "").trim();

      if (!cleanText) continue;
      descriptions.push(cleanText);
    }
  }
  return descriptions.join("\n\n");
}

export function buildItemEmbed(item) {
  const embed = new EmbedBuilder()
    .setTitle(`${item.name} ($${item.cost})`)
    .setThumbnail(item.shop_image)
    .setColor(0xffd700);

  const descriptionText = getDescriptionFromSections(item);

  // Show general description if available
  if (descriptionText) {
    embed.addFields({
      name: "Description",
      value: descriptionText,
    });
  }

  // Item type
  if (item.item_slot_type) {
    const typeName = capitalize(item.item_slot_type);
    const emoji = emojiMap[item.item_slot_type.toLowerCase()] || "";

    embed.addFields({
      name: "Type",
      value: `${emoji} ${typeName}`,
      inline: true,
    });
  }

  // Activation / passive
  if (item.activation) {
    const activationText = ["instant_cast", "press"].includes(item.activation.toLowerCase())
      ? "Active"
      : capitalize(item.activation);

    embed.addFields({
      name: "Activation",
      value: activationText,
      inline: true,
    });
  }

  // Tooltip sections
  if (!item.tooltip_sections?.length) return null;

  item.tooltip_sections.forEach((section) => {
    const sectionLabel = capitalize(section?.section_type);
    if (!sectionLabel) return;

    const value = buildSectionValue(section, item, descriptionText);
    if (value === null) return;

    embed.addFields({
      name: sectionLabel,
      value,
    });
  });

  return embed;
}

function buildSectionValue(section, item, descriptionText) {
  if (!section.section_attributes) return null;

  const sectionContent = [];
  section.section_attributes.forEach((attr) => {
    // Important properties (bold)
    if (!attr.important_properties?.length) return null;
    const importantContent = buildPropertyContent(attr.important_properties, item, true);
    if (importantContent) sectionContent.push(...importantContent);

    // Normal properties
    if (!attr.properties?.length) return null;
    const normalContent = buildPropertyContent(attr.properties, item, false);
    if (normalContent) sectionContent.push(...normalContent);

    // Elevated properties (bold)
    if (!attr.elevated_properties?.length) return null;
    const elevatedContent = buildPropertyContent(attr.elevated_properties, item, true);
    if (elevatedContent) sectionContent.push(...elevatedContent);

    // loc_string (skip if same as descriptionText)
    if (!attr.loc_string) return null;
    const text = attr.loc_string.replace(/<[^>]+>/g, "");
    if (text === descriptionText) return null;
    sectionContent.push(text);
  });

  if (!sectionContent.length) return null;

  return sectionContent.join("\n");
}

function buildPropertyContent(propKeys, item, isBold) {
  const content = [];
  propKeys.forEach((propKey) => {
    const prop = item.properties?.[propKey];
    if (!prop) return;
    const formatted = `${isBold ? "**" : ""}+${prop.value}${prop.postfix || ""} ${prop.label}${isBold ? "**" : ""}`;
    content.push(formatted);
  });
  return content.length ? content : null;
}