export type Rarity = "R" | "SR" | "SSR" | "UR" | "HR" | "LGR" | "SP" | "CSP";

export type Card = {
  id: string;
  name: string;
  source: string;
  rarity: Rarity;
  hp: number;
  atk: number;
  def: number;
  image: string;
};

export const rarityOrder: Rarity[] = ["R", "SR", "SSR", "UR", "HR", "LGR", "SP", "CSP"];

export const rarityMeta: Record<Rarity, { label: string; tone: string }> = {
  R: { label: "稀有", tone: "silver" },
  SR: { label: "超稀有", tone: "blue" },
  SSR: { label: "特别超稀有", tone: "violet" },
  UR: { label: "终极稀有", tone: "rainbow" },
  HR: { label: "全息稀有", tone: "holographic" },
  LGR: { label: "传奇金卡", tone: "gold" },
  SP: { label: "隐藏特别卡", tone: "mythic" },
  CSP: { label: "冠冕特别卡", tone: "crown" },
};

const image = (file: string) => `${import.meta.env.BASE_URL}cards/${file}`;

export const cards: Card[] = [
  { id: "sun-wukong", name: "齐天大圣·孙悟空", source: "西游记", rarity: "SP", hp: 205, atk: 86, def: 44, image: image("qitian-dasheng-sun-wukong-sp-anime.png") },
  { id: "goku-dragonball", name: "孙悟空·七龙珠", source: "七龙珠", rarity: "SP", hp: 235, atk: 110, def: 54, image: image("goku-dragonball-sp.png") },
  { id: "nezha", name: "哪吒", source: "哪吒", rarity: "LGR", hp: 174, atk: 80, def: 32, image: image("nezha-lgr.png") },
  { id: "raiden", name: "雷电将军", source: "原神", rarity: "LGR", hp: 184, atk: 74, def: 37, image: image("raiden-shogun-lgr.png") },
  { id: "mavuika", name: "火神·玛薇卡", source: "原神", rarity: "LGR", hp: 190, atk: 82, def: 36, image: image("mavuika-lgr.png") },
  { id: "anastasya", name: "冰神·安娜丝塔夏", source: "原神", rarity: "LGR", hp: 188, atk: 71, def: 43, image: image("anastasya-lgr.png") },
  { id: "columbina", name: "哥伦比娅", source: "原神", rarity: "LGR", hp: 186, atk: 79, def: 39, image: image("columbina-lgr.png") },
  { id: "light-emperor", name: "光明皇帝", source: "魔神坛斗士", rarity: "LGR", hp: 220, atk: 96, def: 56, image: image("light-emperor-lgr.png") },
  { id: "sailor-moon", name: "水兵月", source: "美少女战士", rarity: "LGR", hp: 212, atk: 91, def: 52, image: image("sailor-moon-lgr.png") },
  { id: "ultraman-tiga", name: "迪迦奥特曼", source: "迪迦奥特曼", rarity: "LGR", hp: 215, atk: 90, def: 58, image: image("ultraman-tiga-lgr.png") },
  { id: "luffy", name: "蒙奇·D·路飞", source: "海贼王", rarity: "LGR", hp: 218, atk: 98, def: 50, image: image("luffy-lgr.png") },
  { id: "naruto", name: "漩涡鸣人", source: "火影忍者", rarity: "LGR", hp: 214, atk: 96, def: 52, image: image("naruto-lgr.png") },
  { id: "falita", name: "次元魔女·法莉塔", source: "蛋仔派对", rarity: "LGR", hp: 208, atk: 89, def: 51, image: image("falita-lgr.png") },
  { id: "gojo", name: "五条悟", source: "咒术回战", rarity: "LGR", hp: 216, atk: 104, def: 48, image: image("gojo-lgr.png") },
  { id: "superman", name: "超人", source: "DC漫画", rarity: "LGR", hp: 228, atk: 103, def: 59, image: image("superman-lgr.png") },
  { id: "ao-guang", name: "东海龙王·敖光", source: "哪吒", rarity: "HR", hp: 175, atk: 60, def: 35, image: image("ao-guang-hr.png") },
  { id: "zhongli", name: "钟离", source: "原神", rarity: "HR", hp: 178, atk: 59, def: 36, image: image("zhongli-hr.png") },
  { id: "mewtwo", name: "超梦", source: "宝可梦", rarity: "HR", hp: 155, atk: 72, def: 26, image: image("mewtwo-hr.png") },
  { id: "sandrone", name: "桑多涅", source: "原神", rarity: "HR", hp: 178, atk: 66, def: 30, image: image("sandrone-hr.png") },
  { id: "nailong", name: "奶龙", source: "奶龙", rarity: "HR", hp: 172, atk: 68, def: 34, image: image("nailong-hr.png") },
  { id: "hatsune-miku", name: "初音未来", source: "初音未来", rarity: "HR", hp: 170, atk: 68, def: 35, image: image("hatsune-miku-hr.png") },
  { id: "qimiao-mengke", name: "奇妙萌可", source: "奇妙萌可", rarity: "HR", hp: 165, atk: 64, def: 34, image: image("qimiao-mengke-hr.png") },
  { id: "mickey", name: "米老鼠", source: "米老鼠", rarity: "HR", hp: 168, atk: 62, def: 34, image: image("mickey-hr.png") },
  { id: "batman", name: "蝙蝠侠", source: "DC漫画", rarity: "HR", hp: 172, atk: 76, def: 40, image: image("batman-hr.png") },
  { id: "golden-peng", name: "金翅大鹏雕", source: "西游记", rarity: "UR", hp: 140, atk: 65, def: 21, image: image("golden-winged-peng-ur.png") },
  { id: "neuvillette", name: "那维莱特", source: "原神", rarity: "UR", hp: 160, atk: 53, def: 30, image: image("neuvillette-ur.png") },
  { id: "water-prince", name: "水王子", source: "叶罗丽", rarity: "UR", hp: 150, atk: 60, def: 26, image: image("water-prince-ur.png") },
  { id: "elsa", name: "艾莎·冰雪女王", source: "冰雪奇缘", rarity: "UR", hp: 145, atk: 64, def: 23, image: image("elsa-ur.png") },
  { id: "doraemon", name: "哆啦A梦", source: "哆啦A梦", rarity: "UR", hp: 180, atk: 72, def: 42, image: image("doraemon-ur.png") },
  { id: "tanjiro", name: "灶门炭治郎", source: "鬼灭之刃", rarity: "UR", hp: 176, atk: 78, def: 36, image: image("tanjiro-ur.png") },
  { id: "twilight-sparkle", name: "紫悦·小马宝莉", source: "小马宝莉", rarity: "UR", hp: 182, atk: 75, def: 40, image: image("twilight-sparkle-ur.png") },
  { id: "xia-letong", name: "夏乐彤", source: "巴啦啦小魔仙", rarity: "UR", hp: 178, atk: 76, def: 41, image: image("xia-letong-ur.png") },
  { id: "levi", name: "利威尔", source: "进击的巨人", rarity: "UR", hp: 170, atk: 88, def: 32, image: image("levi-ur.png") },
  { id: "sakuragi", name: "樱木花道", source: "灌篮高手", rarity: "UR", hp: 190, atk: 80, def: 48, image: image("sakuragi-ur.png") },
  { id: "nezuko", name: "灶门祢豆子", source: "鬼灭之刃", rarity: "UR", hp: 190, atk: 84, def: 45, image: image("nezuko-ur.png") },
  { id: "spiderman", name: "蜘蛛侠", source: "漫威", rarity: "UR", hp: 186, atk: 90, def: 42, image: image("spiderman-ur.png") },
  { id: "ao-bing", name: "敖丙", source: "哪吒", rarity: "SSR", hp: 136, atk: 52, def: 20, image: image("ao-bing-ssr.png") },
  { id: "bull-demon", name: "牛魔王", source: "西游记", rarity: "SSR", hp: 145, atk: 46, def: 24, image: image("bull-demon-king-ssr.png") },
  { id: "lu-dongbin", name: "吕洞宾", source: "八仙过海", rarity: "SSR", hp: 135, atk: 52, def: 20, image: image("lu-dongbin-ssr.png") },
  { id: "arlecchino", name: "阿蕾奇诺", source: "原神", rarity: "SSR", hp: 126, atk: 57, def: 16, image: image("arlecchino-ssr.png") },
  { id: "pikachu", name: "皮卡丘", source: "宝可梦", rarity: "SSR", hp: 124, atk: 57, def: 16, image: image("pikachu-ssr.png") },
  { id: "ice-princess", name: "冰公主", source: "叶罗丽", rarity: "SSR", hp: 142, atk: 47, def: 24, image: image("ice-princess-ssr.png") },
  { id: "tang-sanzang", name: "唐僧", source: "西游记", rarity: "SSR", hp: 150, atk: 52, def: 30, image: image("tang-sanzang-ssr.png") },
  { id: "conan", name: "名侦探柯南", source: "名侦探柯南", rarity: "SSR", hp: 132, atk: 60, def: 25, image: image("conan-ssr.png") },
  { id: "kuromi", name: "库洛米", source: "库洛米", rarity: "SSR", hp: 148, atk: 64, def: 27, image: image("kuromi-ssr.png") },
  { id: "hello-kitty", name: "Hello Kitty", source: "Hello Kitty", rarity: "SSR", hp: 150, atk: 58, def: 29, image: image("hello-kitty-ssr.png") },
  { id: "anya", name: "阿尼亚", source: "间谍过家家", rarity: "SSR", hp: 142, atk: 58, def: 28, image: image("anya-ssr.png") },
  { id: "chase", name: "汪汪队阿奇", source: "汪汪队立大功", rarity: "SSR", hp: 146, atk: 61, def: 33, image: image("chase-ssr.png") },
  { id: "wuliang", name: "无量仙翁", source: "哪吒", rarity: "SR", hp: 130, atk: 40, def: 19, image: image("wuliang-xianweng-sr.png") },
  { id: "six-eared", name: "六耳猕猴", source: "西游记", rarity: "SR", hp: 110, atk: 50, def: 12, image: image("six-eared-macaque-sr.png") },
  { id: "nine-spirit", name: "九灵元圣", source: "西游记", rarity: "SR", hp: 128, atk: 41, def: 19, image: image("nine-spirit-yuan-sr.png") },
  { id: "han-zhongli", name: "汉钟离", source: "八仙过海", rarity: "SR", hp: 129, atk: 40, def: 19, image: image("han-zhongli-sr.png") },
  { id: "tieguai-li", name: "铁拐李", source: "八仙过海", rarity: "SR", hp: 122, atk: 44, def: 17, image: image("tieguai-li-sr.png") },
  { id: "xiao", name: "魈", source: "原神", rarity: "SR", hp: 108, atk: 50, def: 12, image: image("xiao-sr.png") },
  { id: "pang-zun", name: "庞尊", source: "叶罗丽", rarity: "SR", hp: 120, atk: 46, def: 16, image: image("pang-zun-sr.png") },
  { id: "fire-lord", name: "火领主", source: "叶罗丽", rarity: "SR", hp: 110, atk: 50, def: 12, image: image("fire-lord-sr.png") },
  { id: "mandola", name: "曼多拉", source: "叶罗丽", rarity: "SR", hp: 123, atk: 44, def: 17, image: image("mandola-sr.png") },
  { id: "shen-gongbao", name: "申公豹", source: "哪吒", rarity: "R", hp: 95, atk: 45, def: 9, image: image("shen-gongbao-r.png") },
  { id: "taiyi", name: "太乙真人", source: "哪吒", rarity: "R", hp: 115, atk: 35, def: 15, image: image("taiyi-zhenren-r.png") },
  { id: "shiji", name: "石矶娘娘", source: "哪吒", rarity: "R", hp: 105, atk: 40, def: 12, image: image("shiji-niangniang-r.png") },
  { id: "li-jing", name: "李靖", source: "哪吒", rarity: "R", hp: 112, atk: 36, def: 15, image: image("li-jing-r.png") },
  { id: "red-boy", name: "红孩儿", source: "西游记", rarity: "R", hp: 94, atk: 45, def: 9, image: image("red-boy-r.png") },
  { id: "pigsy", name: "猪八戒", source: "西游记", rarity: "R", hp: 115, atk: 35, def: 15, image: image("pigsy-r.png") },
  { id: "zhang-guolao", name: "张果老", source: "八仙过海", rarity: "R", hp: 106, atk: 40, def: 12, image: image("zhang-guolao-r.png") },
  { id: "he-xiangu", name: "何仙姑", source: "八仙过海", rarity: "R", hp: 104, atk: 40, def: 13, image: image("he-xiangu-r.png") },
  { id: "lan-caihe", name: "蓝采和", source: "八仙过海", rarity: "R", hp: 96, atk: 44, def: 10, image: image("lan-caihe-r.png") },
  { id: "han-xiangzi", name: "韩湘子", source: "八仙过海", rarity: "R", hp: 103, atk: 41, def: 12, image: image("han-xiangzi-r.png") },
  { id: "cao-guojiu", name: "曹国舅", source: "八仙过海", rarity: "R", hp: 113, atk: 36, def: 15, image: image("cao-guojiu-r.png") },
  { id: "ganyu", name: "甘雨", source: "原神", rarity: "R", hp: 93, atk: 45, def: 9, image: image("ganyu-r.png") },
  { id: "diluc", name: "迪卢克", source: "原神", rarity: "R", hp: 96, atk: 44, def: 10, image: image("diluc-r.png") },
  { id: "traveler", name: "旅行者", source: "原神", rarity: "R", hp: 105, atk: 40, def: 12, image: image("traveler-r.png") },
  { id: "yanjue", name: "颜爵", source: "叶罗丽", rarity: "R", hp: 108, atk: 39, def: 13, image: image("yanjue-r.png") },
  { id: "furina", name: "水神·芙宁娜", source: "原神", rarity: "CSP", hp: 205, atk: 86, def: 44, image: image("furina-csp.png") },
  { id: "bella-wenjian", name: "贝拉·问剑", source: "贝拉问剑录", rarity: "CSP", hp: 241, atk: 107, def: 37, image: image("bella-wenjian-csp.png") },
  { id: "qianchen", name: "芊辰", source: "原创角色", rarity: "CSP", hp: 230, atk: 77, def: 47, image: image("qianchen-csp.png") },
];

export const cardById = new Map(cards.map((card) => [card.id, card]));

export const rankOf = (rarity: Rarity) => rarityOrder.indexOf(rarity);

export const rarityClass = (rarity: Rarity) => `rarity-${rarity.toLowerCase()}`;
