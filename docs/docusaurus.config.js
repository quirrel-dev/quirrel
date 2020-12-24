module.exports = {
  title: "Quirrel",
  tagline: "The Task Queueing Solution for Next.js x Vercel.",
  url: "https://docs.quirrel.dev",
  baseUrl: "/",
  onBrokenLinks: "throw",
  favicon: "img/favicon.ico",
  organizationName: "quirrel-dev", // Usually your GitHub org/user name.
  projectName: "quirrel", // Usually your repo name.
  scripts: [
    {
      async: true,
      defer: true,
      "data-domain": "docs.quirrel.dev",
      src: "https://plausible.io/js/plausible.js",
    },
    {
      defer: true,
      src: "https://feedback.fish/ff.js?pid=a69c8256a9a967",
    },
  ],
  themeConfig: {
    announcementBar: {
      id: "supportus",
      content:
        '⭐️ If you like Quirrel, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/quirrel-dev/quirrel">GitHub</a>! ⭐️',
    },
    prism: {
      theme: require("prism-react-renderer/themes/github"),
      darkTheme: require("prism-react-renderer/themes/palenight"),
    },
    algolia: {
      apiKey: "2847a8b1da250cce60314892409484d8",
      indexName: "quirrel-next",
      searchParameters: {}, // Optional (if provided by Algolia)
    },
    navbar: {
      title: "Quirrel",
      logo: {
        alt: "Quirrel Logo Logo",
        src: "/img/horn_transparent.png",
        href: "https://quirrel.dev",
      },
      hideOnScroll: true,
      items: [
        {
          to: "/docs",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        {
          to: "/api",
          activeBasePath: "api",
          label: "API",
          position: "left",
        },
        {
          "data-feedback-fish": "",
          label: "Feedback",
          position: "right",
        },
        {
          href: "https://github.com/quirrel-dev",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/",
            },
            {
              label: "Deploy",
              to: "/docs/deploying",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Stack Overflow",
              href: "https://stackoverflow.com/questions/tagged/quirrel",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/quirrel_dev",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "https://dev.to/quirrel",
            },
            {
              label: "GitHub",
              href: "https://github.com/quirrel-dev",
            },
          ],
        },
        {
          title: "Legal",
          items: [
            {
              label: "Privacy",
              to: "https://quirrel.dev/privacy",
            },
            {
              label: "Terms",
              href: "https://quirrel.dev/terms",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Simon Knott. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl:
            "https://github.com/quirrel-dev/quirrel/edit/master/docs/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
