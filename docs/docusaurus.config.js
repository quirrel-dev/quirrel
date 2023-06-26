module.exports = {
  title: "Quirrel",
  tagline: "The Task Queueing Solution for Serverless.",
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
  ],
  themeConfig: {
    announcementBar: {
      id: "supportus",
      backgroundColor: "#2250F4",
      isCloseable: false,
      textColor: "white",
      content: `
        <div style="font-weight: 700; margin: 2px;">
          <img
            src="https://www.netlify.com/v3/img/components/logomark-dark.svg"
            className="h-5 w-5 mr-2 text-blue-300"
            style="vertical-align: middle; width: 1.25rem; margin-bottom: 1px; margin-right: 3px;"
            alt="netlify logo"
          />
          <span >
          Quirrel joins Netlify. <a target="_blank" rel="noopener noreferrer" href="https://dev.to/quirrel/quirrel-is-acquired-and-i-am-joining-netlify-dha">Learn more</a>
          </span>
        </div>
        `,
    },
    prism: {
      theme: require("prism-react-renderer/themes/github"),
      darkTheme: require("prism-react-renderer/themes/palenight"),
    },
    algolia: {
      apiKey: "2847a8b1da250cce60314892409484d8",
      appId: "BH4D9OD16A",
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
          to: "/",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        {
          to: "/api/queue",
          activeBasePath: "api",
          label: "API",
          position: "left",
        },
        {
          href: "https://github.com/quirrel-dev/quirrel/issues/new/choose",
          label: "Feedback",
          position: "right",
        },
        {
          href: "https://github.com/quirrel-dev/quirrel",
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
              to: "/deployment/connecting",
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
          editUrl: "https://github.com/quirrel-dev/quirrel/edit/main/docs/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
