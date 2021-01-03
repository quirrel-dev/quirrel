module.exports = {
  home: [
    "introduction",
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: ["getting-started/next-js", "getting-started/blitz-js"],
    },
    "deploying",
    "migrating-to-v1",
    "how-quirrel-works",
    "faq",
  ],
  docs: [
    {
      type: "category",
      label: "API Reference",
      collapsed: false,
      items: ["api/queue", "api/cronjob"],
    },
    {
      type: "category",
      label: "Frameworks",
      collapsed: false,
      items: [
        "api/next",
        "api/blitz",
        "api/redwood",
        "api/nuxt",
        "api/express",
        "api/vercel",
      ],
    },
  ],
};
