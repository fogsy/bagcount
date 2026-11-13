export type ProductColor = {
  name: string;
  hex: string;
};

export type MockProduct = {
  handle: string;
  title: string;
  price: number;
  currency: string;
  description: string;
  colors: ProductColor[];
  sizes: string[];
  featured?: boolean;
  imageGradient: string;
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    handle: "american-heavyweight",
    title: "American Heavyweight",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — bold mark, fight-camp fit.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    featured: true,
    imageGradient: "from-blue-600/40 to-slate-900",
  },
  {
    handle: "brazilian-champion",
    title: "Brazilian Champion",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee for the Brazilian champion energy.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Forest Green", hex: "#14532d" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    imageGradient: "from-emerald-600/40 to-slate-900",
  },
  {
    handle: "rising-sun-striker",
    title: "Rising Sun Striker",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — rising sun striker edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Dark Chocolate", hex: "#3f2a1d" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    imageGradient: "from-rose-500/30 to-slate-900",
  },
  {
    handle: "boricua-brawler",
    title: "Boricua Brawler",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Boricua brawler edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-sky-500/30 to-slate-900",
  },
  {
    handle: "cuban-contender",
    title: "Cuban Contender",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Cuban contender edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-blue-400/30 to-slate-900",
  },
  {
    handle: "russian-titan",
    title: "Russian Titan",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Russian titan edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-indigo-500/30 to-slate-900",
  },
  {
    handle: "french-fury",
    title: "French Fury",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — French fury edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-violet-500/30 to-slate-900",
  },
  {
    handle: "turkish-thunder",
    title: "Turkish Thunder",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Turkish thunder edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-cyan-500/30 to-slate-900",
  },
  {
    handle: "italian-prizefighter",
    title: "Italian Prizefighter",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Italian prizefighter edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-green-500/20 to-slate-900",
  },
  {
    handle: "german-iron-fist",
    title: "German Iron Fist",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — German iron fist edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-zinc-500/40 to-slate-900",
  },
  {
    handle: "korean-lightning",
    title: "Korean Lightning",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Korean lightning edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-blue-500/40 to-slate-900",
  },
  {
    handle: "mexican-warrior",
    title: "Mexican Warrior",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Mexican warrior edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Maroon", hex: "#7f1d1d" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-orange-500/30 to-slate-900",
  },
  {
    handle: "chinese-challenger",
    title: "Chinese Challenger",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Chinese challenger edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "White", hex: "#f5f5f7" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-red-500/20 to-slate-900",
  },
  {
    handle: "northern-knockout",
    title: "Northern Knockout",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Northern knockout edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-sky-300/20 to-slate-900",
  },
  {
    handle: "australia-heavy-hitter",
    title: "Australia Heavy Hitter",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Australia heavy hitter edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-amber-500/25 to-slate-900",
  },
  {
    handle: "british-bruiser",
    title: "British Bruiser",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — British bruiser edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Navy", hex: "#1e3a5f" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-blue-800/40 to-slate-900",
  },
  {
    handle: "spanish-powerhouse",
    title: "Spanish Powerhouse",
    price: 26,
    currency: "USD",
    description: "BoxingAI tee — Spanish powerhouse edition.",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Maroon", hex: "#7f1d1d" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    imageGradient: "from-yellow-500/20 to-slate-900",
  },
];

export function getMockProduct(handle: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.handle === handle);
}
