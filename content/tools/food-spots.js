/* 餐厅卡片：area 对应 food-areas.js 中的 id，zone 必须属于该地区；photos 为图片路径。 */
const FOOD_SPOTS = [
  {
    id: "zhaohui-case",
    name: "朝晖案例<占位符>", // ★改这里：门面名称
    area: "zhaohui", // 一级：大学城
    zone: "校内", // 二级：校内
    address: "食堂三楼 · 最里面那档", // ★改这里：门面地址
    taste: "清汤 · 微辣 · 可选不加香菜", // ★改这里：口味偏好
    price: "人均 12 元", // ★改这里：价格区间
    review: [
      // ★改这里：我的评价（想写几段就写几个字符串）
      "牛腱子炖得够烂，筷子一夹就散，汤是那种早上六点就熬上的清汤。",
      "赶时间的时候首选，出餐三分钟。缺点是十一点半以后要排长队。",
    ],
    photos: ["assets/img/food/noodle-01.jpg", "assets/img/food/noodle-02.jpg"], // ★改这里：照片
    tags: ["面食", "出餐快"],
  },
  {
    id: "pingfeng-case",
    name: "屏峰案例<占位符>",
    area: "pingfeng", // 一级：城南
    zone: "校外", // 二级：校外
    address: "北门出去右转 200 米 · 红色灯箱那家",
    taste: "骨汤 · 中辣 · 加酸豆角更好",
    price: "人均 15 元",
    review: [
      "汤底是骨头熬的，白得像米汤，配一勺红油刚好。",
      "阿姨记得住熟客的口味，第三次去她就知道我要多加花生。",
      "地方很小，只有六张桌子，晚上七点后基本坐满。",
    ],
    photos: ["assets/img/food/rice-noodle-01.jpg", "assets/img/food/rice-noodle-02.jpg"],
    tags: ["粉面", "深夜", "小店"],
  },
  {
    id: "moganshan-case",
    name: "莫干山案例<占位符>",
    area: "moganshan", // 一级：老城区
    zone: "校外", // 二级：校外
    address: "城南老街 47 号 · 靠着那棵大樟树",
    taste: "家常 · 少油 · 红烧肉偏甜",
    price: "人均 45 元",
    review: [
      "三菜一汤都做得稳，红烧肉收汁收得漂亮，不腻。",
      "店里只有六张木桌，午后阳光斜进来的时候特别好，适合坐很久。",
      "周末要提前打电话，不然大概率没位子。",
    ],
    photos: ["assets/img/food/bistro-01.jpg", "assets/img/food/bistro-02.jpg"],
    tags: ["家常菜", "适合聊天"],
  },
];
