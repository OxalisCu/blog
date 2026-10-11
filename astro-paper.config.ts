import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://oxaliscu.github.io/blog/",
    title: "酢浆草",
    description:
      "一个 AI 味很浓的博客。AI 干完活了，我还在问：“这咋弄的？”问明白了就记下来，忘了再回来抄自己的。",
    author: "酢浆草",
    ogImage: "default-og.jpg",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: { perPage: 10, perIndex: 5 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [],
  shareLinks: [],
});
