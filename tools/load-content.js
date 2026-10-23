const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const files = JSON.parse(fs.readFileSync(path.join(root, "content/files.json"), "utf8"));
const source = files.map(f => fs.readFileSync(path.join(root, "content", f), "utf8")).join("\n");
module.exports = { source, load(extra = "") {
  return new Function(source + "\n" + extra + "\nreturn ({SITE: {...SITE, ...PROFILE, heroImage: HOME.heroImage, heroQuote: SITE.footerQuote, giscus: POST_CONFIG.giscus}, PROFILE, HOME, POST_CONFIG, POSTS, QUOTES, GALLERY, LINKS, TIMELINE, NOW, SKILLS, HOME_LAYOUT, TOOLS, TOOLS_CONFIG, FOOD_AREAS, FOOD_SPOTS" + (extra ? ",Markdown" : "") + "});")();
}};
