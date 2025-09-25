import axios from "axios";
import sharp from "sharp";

const DEADLOCK_API_URL = "https://api.deadlock-api.com/v1";

let ITEMS = {};

// -------------------- Setup --------------------
async function itemSetup() {
  const res = await axios.get("https://assets.deadlock-api.com/v2/items/by-type/upgrade");
  for (const item of res.data) {
    ITEMS[item.id] = item;
  }
}
await itemSetup();

// -------------------- Helpers --------------------
function getItem(id) {
  return ITEMS[id] || null;
}

function isUpgrade(id) {
  return !!getItem(id);
}

function validRandomItem(id) {
  const item = ITEMS[id];
  if (!item) return false;
  if (item.disabled === true) return false;
  if (!item.shopable) return false;
  if (item.cost < 3200) return false;
  return true;
}

function randomizedInventory() {
  const inventory = [];
  const keys = Object.keys(ITEMS).map(Number);

  while (inventory.length < 12) {
    let item = keys[Math.floor(Math.random() * keys.length)];
    while (inventory.includes(item) || !validRandomItem(item)) {
      item = keys[Math.floor(Math.random() * keys.length)];
    }
    inventory.push(item);
  }
  return inventory;
}

// -------------------- Image Helpers --------------------
async function getItemImg(id) {
  const item = getItem(id);
  if (!item) {
    console.error("Item not found:", id);
    return null;
  }
  const res = await axios.get(item.shop_image_small, { responseType: "arraybuffer" });
  return sharp(res.data).resize(100, 100);
}

async function getInventoryImages(data) {
  const ret = [];
  for (const d of data) {
    if (d.sold_time_s !== 0) continue;
    if (isUpgrade(d.item_id)) {
      const img = await getItemImg(d.item_id);
      if (img) ret.push(img);
    }
  }
  return ret;
}

async function getInventoryImagesFromIds(ids) {
  const ret = [];
  for (const id of ids) {
    const img = await getItemImg(id);
    if (img) ret.push(img);
  }
  return ret;
}

async function buildInventoryImg(itemImages) {
  const retImage = sharp({
    create: {
      width: 600,
      height: 200,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  });

  const composites = [];
  let x = 0, y = 0, count = 0;

  for (const img of itemImages) {
    const buffer = await img.toBuffer();
    composites.push({ input: buffer, left: x, top: y });

    x += 100;
    count++;
    if (count > 5) {
      y = 100;
      x = 0;
      count = 0;
    }
  }

  return retImage.composite(composites);
}

// -------------------- Public Functions --------------------
async function dcImageFile(data) {
  const images = await getInventoryImages(data);
  return buildInventoryImg(images);
}

async function randomizedInvImage() {
  const inv = randomizedInventory();
  const images = await getInventoryImagesFromIds(inv);
  return buildInventoryImg(images);
}

export {
  getItem,
  isUpgrade,
  validRandomItem,
  randomizedInventory,
  getItemImg,
  getInventoryImages,
  getInventoryImagesFromIds,
  buildInventoryImg,
  dcImageFile,
  randomizedInvImage,
};
