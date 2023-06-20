module.exports = {
  home: [
    "introduction",
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: ["getting-started/next-js", "getting-started/blitz-js"],
    },
    "development",
    {
      type: "category",
      label: "Deployment",
      collapsed: false,
      items: [
        "deployment/connecting",
        "deployment/docker",
        "deployment/railway",
        "deployment/fly",
      ],
    },
    {
      type: "category",
      label: "Recipes",
      collapsed: false,
      items: [
        "recipes/event-reminder",
        "recipes/monthly-invoices",
        "recipes/remove-old-data",
        "recipes/processing-upload-in-background",
      ],
    },
    "migrating-to-v1",
    "migrating-servers",
    "how-quirrel-works",
    "faq",
    "netlify-acquisition-faq",
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
        "api/netlify",
        "api/remix",
        "api/sveltekit",
        "api/nuxt",
        "api/express",
        "api/vercel",
      ],
    },
  ],
};
