export type Rarity = "N" | "R" | "SR" | "SSR" | "UR" | "HIDDEN";
export type PityRarity = Exclude<Rarity, "HIDDEN">;

export type FairyCard = {
  id: string;
  name: string;
  character?: string;
  form?: string;
  rarity: Rarity;
  element: string;
  note: string;
  portraitIndex?: number;
  portraitSet?: "alternate";
  imageFile?: string;
};

export const MAX_DAILY_PACKS = 15;
export const CARDS_PER_PACK = 5;
export const TOTAL_CARDS = 100;

export const RARITIES: Array<{
  code: Rarity;
  label: string;
  rate: number;
  rateText: string;
  color: string;
}> = [
  { code: "N", label: "普通", rate: 52, rateText: "52%", color: "#8795b0" },
  { code: "R", label: "稀有", rate: 29, rateText: "29%", color: "#438fd7" },
  { code: "SR", label: "超稀有", rate: 13, rateText: "13%", color: "#8656cd" },
  { code: "SSR", label: "珍藏", rate: 4.5, rateText: "4.5%", color: "#d879aa" },
  { code: "UR", label: "传说", rate: 1.45, rateText: "1.45%", color: "#ca9638" },
  { code: "HIDDEN", label: "隐藏", rate: 0.05, rateText: "0.05%", color: "#584078" },
];

export const RARITY_ORDER: Rarity[] = ["N", "R", "SR", "SSR", "UR", "HIDDEN"];
export const PITY_THRESHOLDS: Record<PityRarity, number> = {
  N: 5,
  R: 8,
  SR: 16,
  SSR: 35,
  UR: 100,
};
export const GUARANTEE_ORDER: PityRarity[] = ["UR", "SSR", "SR", "R", "N"];

const splitCharacterName = (name: string) => name.split("·")[0].trim();

const art = (id: string, name: string, rarity: Rarity, element: string, note: string, portraitIndex: number): FairyCard => ({
  id,
  name,
  character: splitCharacterName(name),
  form: name.includes("·") ? name.split("·").slice(1).join("·").trim() : "星愿初遇",
  rarity,
  element,
  note,
  portraitIndex,
});

const framedArt = (id: string, name: string, rarity: Rarity, element: string, note: string, imageFile: string): FairyCard => ({
  id,
  name,
  character: splitCharacterName(name),
  form: name.includes("·") ? name.split("·").slice(1).join("·").trim() : "星愿初遇",
  rarity,
  element,
  note,
  imageFile,
});

const BASE_CARDS: FairyCard[] = [
  art("wang-mo", "王默", "N", "心之火花", "相信自己，魔法就会回应。", 0),
  art("jian-peng", "建鹏", "N", "森林活力", "勇敢向前，伙伴就在身边。", 1),
  art("wen-qian", "文茜", "N", "镜中花影", "每颗心里，都藏着小小的愿望。", 2),
  art("shu-yan", "舒言", "N", "静谧时光", "耐心观察，就能发现答案。", 3),
  art("gao-tai-ming", "高泰明", "N", "光之旋律", "用自己的节奏，照亮前方。", 4),
  art("feng-yinsha", "封银沙", "N", "月影守护", "温柔的心，也有坚定的力量。", 5),

  art("liang-cai", "亮彩", "R", "星光守护", "把一点点光，送给需要的人。", 6),
  art("moli", "茉莉", "R", "甜蜜花语", "一朵花，也能装下好心情。", 7),
  art("hei-xiangling", "黑香菱", "R", "暗香藤蔓", "相信自己，花朵就会绽放。", 8),
  art("huang-shi", "荒石", "R", "岩石守望", "沉稳可靠，是最温暖的守护。", 9),
  art("fei-ling", "菲灵", "R", "命运之羽", "每一次选择，都能写下新故事。", 10),
  art("qi-na", "齐娜", "R", "塔罗星语", "勇气会带来属于你的好牌。", 11),

  art("chen-sisi", "陈思思", "SR", "冰雪琴音", "优雅与努力，可以一起闪耀。", 12),
  art("blue-peacock", "蓝孔雀", "SR", "孔雀之羽", "自信地做自己，就是最美的魔法。", 13),
  art("bai-guangying", "白光莹", "SR", "明亮心愿", "心意相通时，光芒会更加明亮。", 14),
  art("jin-wangzi", "金王子", "SR", "黄金誓约", "守护重要的人，需要勇气。", 15),
  art("fire-lord", "火领主", "SR", "炽热之焰", "热情能点亮前行的路。", 22),
  art("pang-zun", "庞尊", "SR", "雷霆之力", "闪电般的力量，也能用来守护。", 23),

  art("luo-li", "罗丽", "SSR", "玫瑰公主", "把善意送给朋友，奇迹就会发生。", 16),
  framedArt("ice-princess", "冰公主", "SSR", "冰晶雪花", "冰雪之中，也藏着温柔的光。", "ice-princess-ssr.png"),
  art("xin-ling", "辛灵", "SSR", "浮云楼守护", "守护仙境的心意，从未改变。", 17),
  art("ling-gongzhu", "灵公主", "SSR", "生命花园", "每一种生命，都值得被珍惜。", 18),

  framedArt("water-prince", "水王子", "UR", "净水之源", "清澈的水，映出坚定的心。", "water-prince-ur.png"),
  art("shi-xi", "时希", "UR", "时间之门", "珍惜此刻，未来就会慢慢展开。", 19),
  art("yan-jue", "颜爵", "UR", "灵犀雅韵", "以画笔描绘仙境的奇妙故事。", 20),

  art("wang-mo-fire-princess", "王默·火之公主", "HIDDEN", "隐藏形态", "一颗勇敢的心，绽放出耀眼火光。", 21),
];

const alternatePortraits: Record<string, number[]> = {
  王默: [0, 2, 3, 23],
  建鹏: [16, 14],
  文茜: [9, 15, 19],
  舒言: [17, 16, 22],
  高泰明: [13, 16],
  封银沙: [7, 22],
  亮彩: [11, 10],
  茉莉: [18, 4, 3],
  黑香菱: [19, 15, 9],
  荒石: [21, 22],
  菲灵: [15, 9, 19],
  齐娜: [20, 17],
  陈思思: [5, 8, 11],
  蓝孔雀: [6, 5],
  白光莹: [11, 13, 0],
  金王子: [12, 16],
  火领主: [14, 2, 12],
  庞尊: [13, 14, 16],
  罗丽: [4, 0, 3, 23],
  冰公主: [8, 5],
  辛灵: [9, 11, 15],
  灵公主: [10, 11, 4],
  水王子: [7, 22, 16],
  时希: [17, 20, 8],
  颜爵: [22, 16, 13],
};

type VariantIdea = { form: string; element: string; note: string };

const VARIANT_IDEAS: Record<Exclude<Rarity, "HIDDEN">, VariantIdea[]> = {
  N: [
    { form: "校园午后", element: "晴日微风", note: "课间的笑声，也能成为珍贵的魔法。" },
    { form: "花园散步", element: "花叶轻语", note: "慢慢散步时，能听见花朵的小秘密。" },
    { form: "星星睡衣", element: "晚安星光", note: "把今天的快乐收好，明天继续闪耀。" },
    { form: "彩虹野餐", element: "彩虹心情", note: "和朋友分享点心，快乐就会加倍。" },
    { form: "晨间练习", element: "清晨活力", note: "每天练习一点点，勇气也会长大。" },
    { form: "图书时光", element: "故事书页", note: "翻开书页，就能走进新奇的世界。" },
    { form: "泡泡假日", element: "泡泡闪光", note: "追着泡泡跑，把烦恼都留在身后。" },
    { form: "生日心愿", element: "甜蜜祝福", note: "许下真诚的愿望，心里就亮晶晶。" },
    { form: "叶片书签", element: "森林书香", note: "夹进一片叶子，把森林带在身边。" },
    { form: "云朵漫步", element: "软绵云朵", note: "抬头看看云，想象力就飞起来了。" },
    { form: "手作花环", element: "缤纷花环", note: "亲手做的小礼物，藏着满满的心意。" },
    { form: "海边拾贝", element: "海风贝壳", note: "每枚贝壳里，都住着一段海边回忆。" },
    { form: "萤火夜游", element: "萤火微光", note: "萤火虫提着灯笼，陪大家一起回家。" },
    { form: "朋友合影", element: "友谊相片", note: "最喜欢的照片里，总有伙伴的笑脸。" },
  ],
  R: [
    { form: "缤纷舞会", element: "舞步花火", note: "跟着音乐旋转，快乐在裙摆间绽放。" },
    { form: "月桂守护", element: "月桂祝福", note: "把温柔的祝福送给每一位伙伴。" },
    { form: "春日信使", element: "春风信笺", note: "春天的消息，随着花香送到身边。" },
    { form: "星光露营", element: "夜空营火", note: "围着小小营火，分享勇敢的故事。" },
    { form: "水晶音乐会", element: "水晶乐音", note: "清亮的旋律像水晶一样闪闪发光。" },
    { form: "银叶旅装", element: "远行微风", note: "带上好奇心，去发现仙境新风景。" },
    { form: "甜心茶会", element: "花茶香气", note: "一杯暖茶，让朋友的心靠得更近。" },
    { form: "花瓣信使", element: "花瓣邮笺", note: "一封手写的信，装着说不完的心意。" },
    { form: "萤光花田", element: "流萤花海", note: "小小的光芒聚在一起，也能照亮夜空。" },
    { form: "守护徽章", element: "勇气徽章", note: "这枚徽章，送给一直坚持的自己。" },
    { form: "梦境旅人", element: "甜梦羽翼", note: "跟随梦里的星星，找到回家的方向。" },
    { form: "海盐气泡", element: "蔚蓝气泡", note: "海浪轻轻唱歌，带来清凉的问候。" },
    { form: "琉璃花灯", element: "琉璃灯火", note: "点亮一盏花灯，把愿望送向远方。" },
    { form: "森林音乐节", element: "林间节拍", note: "树叶和小鸟，也加入了欢乐的合奏。" },
    { form: "枫叶收藏家", element: "秋日枫红", note: "把秋天最美的颜色，珍藏在手心。" },
    { form: "极光旅行", element: "极光流彩", note: "极光在天边舞动，像一封温柔的信。" },
  ],
  SR: [
    { form: "月下协奏", element: "月华琴音", note: "月光与琴声交织，奏出坚定的心愿。" },
    { form: "孔雀庆典", element: "翡翠羽光", note: "每一片羽毛都映出独一无二的光彩。" },
    { form: "冰晶华尔兹", element: "冰晶舞曲", note: "冰雪随着舞步闪耀，温柔而又明亮。" },
    { form: "花灵巡游", element: "花灵祝祷", note: "花朵簇拥着她，唱起守护生命的歌。" },
    { form: "紫藤誓约", element: "紫藤守护", note: "紫藤花下的约定，会一直被认真守护。" },
    { form: "金羽试炼", element: "金羽勇气", note: "真正的力量，是为了保护重要的人。" },
    { form: "雷云竞速", element: "雷鸣疾风", note: "一道闪电掠过天际，留下勇敢的身影。" },
    { form: "蔷薇花语", element: "蔷薇心意", note: "每一朵蔷薇，都在传递温暖的心意。" },
    { form: "焰心守望", element: "焰心之光", note: "热烈的火光照亮伙伴，也照亮自己的路。" },
    { form: "镜月幻舞", element: "镜月幻彩", note: "镜中的月色变成翅膀，带她飞向远方。" },
    { form: "琥珀花园", element: "琥珀花雨", note: "将珍贵的回忆收藏，等待花朵再次盛开。" },
    { form: "海潮守护者", element: "海潮之心", note: "潮汐的力量，守护着海洋深处的秘密。" },
    { form: "白昼咏叹", element: "晨曦咏叹", note: "第一束晨光，为新的冒险拉开序幕。" },
    { form: "暗夜花影", element: "夜色藤花", note: "即使身处暗处，也能等到盛开的时刻。" },
    { form: "古堡寻宝", element: "古堡秘钥", note: "勇敢解开谜题，发现藏在古堡里的惊喜。" },
    { form: "云海飞行", element: "云海之翼", note: "穿过云海俯瞰仙境，每处风景都很动人。" },
    { form: "琉金花嫁", element: "琉金花雨", note: "金色花瓣飘落，为勇敢的心送上祝福。" },
  ],
  SSR: [
    { form: "王室花园庆典", element: "王冠蔷薇", note: "玫瑰与星光共同守护这份珍贵的友谊。" },
    { form: "冰雪女王礼装", element: "雪莲冰华", note: "清冷的冰雪中，藏着愿意守护伙伴的心。" },
    { form: "浮云楼秘典", element: "浮云之钥", note: "古老藏书阁的每一页，都写着守护的约定。" },
    { form: "生命树祈愿", element: "生命树光", note: "让生命的光辉，照耀每一位朋友。" },
    { form: "火焰舞会", element: "炽焰舞章", note: "火焰化作华丽舞步，点燃勇气与热情。" },
    { form: "星河礼服", element: "星河流光", note: "穿过银河，她把一颗星星送给了伙伴。" },
    { form: "梦境典藏", element: "梦境花冠", note: "珍藏于梦境的花冠，承载真挚的愿望。" },
    { form: "镜界华服", element: "镜界月辉", note: "镜中映出不同的自己，每一种都值得珍惜。" },
    { form: "日冕仪式", element: "日冕圣光", note: "温暖的光辉落下，守护仙境每一个角落。" },
    { form: "深海礼赞", element: "深海珍珠", note: "海底珍珠闪闪发光，映出坚定的心意。" },
    { form: "花神冠冕", element: "百花冠冕", note: "百花齐放的时节，她将祝福赠予伙伴。" },
    { form: "时之沙庭", element: "时之沙漏", note: "每粒沙都记得相遇，每一刻都值得珍惜。" },
    { form: "灵犀盛典", element: "灵犀宝石", note: "真心相连的伙伴，拥有最闪亮的魔法。" },
    { form: "水晶王座", element: "水晶王座", note: "守护水晶王座的誓言，永远不会褪色。" },
  ],
  UR: [
    { form: "星愿觉醒", element: "星愿之心", note: "漫天星辰响应心愿，绽放出全新的力量。" },
    { form: "时空守门人", element: "时空回环", note: "她穿过时光长河，守护每一次珍贵相遇。" },
    { form: "灵犀阁主礼服", element: "灵犀之约", note: "众仙齐聚灵犀阁，共同立下守护誓约。" },
    { form: "永恒花冠", element: "永恒花冠", note: "花冠汇聚众人的心愿，成为不灭的光芒。" },
    { form: "万象镜界", element: "万象镜界", note: "穿越重重镜界，依然坚定地寻找伙伴。" },
    { form: "极光圣典", element: "极光圣典", note: "极光倾泻而下，仙境迎来宁静的新夜晚。" },
    { form: "水晶之源", element: "水晶之源", note: "源泉映照着万物，守护生命永不停息。" },
    { form: "曙光盟约", element: "曙光盟约", note: "当伙伴手牵手时，最耀眼的光便会出现。" },
    { form: "星海巡礼", element: "星海巡礼", note: "她沿着星海归来，把勇气与希望带给大家。" },
    { form: "守护神谕", element: "守护神谕", note: "神谕传来新的任务，她微笑着勇敢出发。" },
  ],
};

const characterList = Array.from(new Map(BASE_CARDS.map((card) => [card.character!, card.character!])).values());
const rarityOffset: Record<Exclude<Rarity, "HIDDEN">, number> = { N: 0, R: 5, SR: 10, SSR: 15, UR: 20 };

function createVariants(rarity: Exclude<Rarity, "HIDDEN">): FairyCard[] {
  return VARIANT_IDEAS[rarity].map((idea, index) => {
    const character = characterList[(index * 7 + rarityOffset[rarity]) % characterList.length];
    const formId = idea.form.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");
    return {
      id: `form-${rarity.toLowerCase()}-${index + 1}-${formId}`,
      name: `${character}·${idea.form}`,
      character,
      form: idea.form,
      rarity,
      element: idea.element,
      note: idea.note,
      portraitIndex: (alternatePortraits[character] ?? [0])[(index + rarityOffset[rarity] / 5) % (alternatePortraits[character]?.length ?? 1)],
      portraitSet: "alternate",
    };
  });
}

const hiddenVariants: FairyCard[] = [
  { id: "hidden-wang-mo-star-crown", name: "王默·星冠奇迹", character: "王默", form: "星冠奇迹", rarity: "HIDDEN", element: "隐藏形态", note: "星光与火焰相遇，最勇敢的心愿化成奇迹。", portraitIndex: 2, portraitSet: "alternate" },
  { id: "hidden-luo-li-rose-miracle", name: "罗丽·玫瑰奇迹", character: "罗丽", form: "玫瑰奇迹", rarity: "HIDDEN", element: "隐藏形态", note: "玫瑰花瓣围绕她绽放，藏着一份珍贵的守护。", portraitIndex: 0, portraitSet: "alternate" },
  { id: "hidden-water-prince-moon-tide", name: "水王子·月潮奇迹", character: "水王子", form: "月潮奇迹", rarity: "HIDDEN", element: "隐藏形态", note: "月光照进净水之中，映出仙境最神秘的传说。", portraitIndex: 7, portraitSet: "alternate" },
];

export const CARDS: FairyCard[] = [
  ...BASE_CARDS,
  ...createVariants("N"),
  ...createVariants("R"),
  ...createVariants("SR"),
  ...createVariants("SSR"),
  ...createVariants("UR"),
  ...hiddenVariants,
];

export const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));
export const RARITY_BY_CODE = new Map(RARITIES.map((rarity) => [rarity.code, rarity]));
export const PORTRAIT_SHEET = `${import.meta.env.BASE_URL}gacha/assets/characters.png`;
export const ALTERNATE_PORTRAIT_SHEET = `${import.meta.env.BASE_URL}gacha/assets/characters-alt.png`;
export const PACK_ART = `${import.meta.env.BASE_URL}gacha/assets/starwish-pack.png`;
export const GARDEN_ART = `${import.meta.env.BASE_URL}gacha/assets/crystal-garden.png`;
export const CARD_ART_BASE = `${import.meta.env.BASE_URL}cards/`;
