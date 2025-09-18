import { EmbedBuilder } from "discord.js";
import * as cheerio from "cheerio";

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

// --- HTML to Discord-safe text ---
function parseHtmlToText(html) {
  if (!html) return "";

  const $ = cheerio.load(html);

  // Remove SVGs completely
  $("svg").remove();

  // Handle known spans
  $(".highlight").each((_, el) => {
    $(el).replaceWith(`**${$(el).text()}**`);
  });
  $(".inline-attribute-label").each((_, el) => {
    $(el).replaceWith($(el).text());
  });

  // Extract raw text
  let text = $.text();

  // Collapse multiple spaces/newlines → single space
  text = text.replace(/\s*\n\s*/g, " "); // join broken lines
  text = text.replace(/\s{2,}/g, " ");   // collapse double+ spaces

  return text.trim();
}

// Extract description from tooltip sections
function getDescriptionFromSections(item) {
  if (!item.tooltip_sections?.length) return "";

  return item.tooltip_sections
    .flatMap((section) =>
      section.section_attributes?.map((attr) => {
        if (!attr.loc_string) return null;
        return parseHtmlToText(attr.loc_string);
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
    const text = parseHtmlToText(attr.loc_string);
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

// Add component / upgrade path dynamically
function addComponentItems(embed, item, allItemsArray) {
  if (!item.component_items?.length) {
    console.log(`[addComponentItems] No component items for ${item.name}`);
    return;
  }

  console.log(`[addComponentItems] Processing component items for ${item.name}:`, item.component_items);

  const componentsText = item.component_items
    .map((componentClassName) => {
      const compItem = allItemsArray.find(i => i.class_name === componentClassName);
      if (compItem && compItem.name) {
        console.log(`[addComponentItems] Found component: class_name=${componentClassName}, name=${compItem.name}`);
        return compItem.name;
      } else {
        console.warn(`[addComponentItems] Component not found: class_name=${componentClassName}`);
        return capitalize(componentClassName.replace(/_/g, " "));
      }
    })
    .join(", ");

  console.log(`[addComponentItems] Final Upgrade Path for ${item.name}: ${componentsText}`);

  if (componentsText) {
    embed.addFields({
      name: "Upgrade Path",
      value: componentsText,
    });
  }
}

// Build the full item embed dynamically with API data
export function buildItemEmbed(item, allItemsArray) {
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
      value: `${emoji} ${typeName}`.trim(),
      inline: true,
    });
  }

  // Add activation
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

  // Add tooltip sections (stats)
  addTooltipSections(embed, item, descriptionText);

  // Add upgrade path if it exists
  addComponentItems(embed, item, allItemsArray);

  return embed;
}
