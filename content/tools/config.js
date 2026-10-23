/* 工具入口卡与参数；id、anchor 需要与 tools.html 对应。 */
const TOOLS = [
  {
    id: "dice", // ← 内部编号，不要改
    name: "骰子点数生成器", // ★改这里：工具名字
    desc: "一次扔 1~10 颗标准六面骰，自动帮你算总和。", // ★改这里：一句话说明
    icon: "🎲", // ★改这里：图标（可直接换 emoji）
    anchor: "#tool-dice",
  },
  {
    id: "coin",
    name: "扔硬币",
    desc: "一次扔 1~10 枚硬币，统计正反面各几枚。",
    icon: "🪙",
    anchor: "#tool-coin",
  },
  {
    id: "food",
    name: "今天吃什么",
    desc: "先选地区和校外，再抽一张餐厅卡。",
    icon: "🍜",
    anchor: "#tool-food",
  },
];

const TOOLS_CONFIG = {
  diceMax: 10, // ★改这里：骰子最多几颗
  diceFaces: 6, // ★改这里：骰子几面
  coinMax: 10, // ★改这里：硬币最多几枚
  rollMs: 900, // ★改这里：骰子动画时长（毫秒）
  flipMs: 1100, // ★改这里：硬币动画时长（毫秒）
  foodDrawMs: 700, // ★改这里：抽卡动画时长（毫秒）
};
