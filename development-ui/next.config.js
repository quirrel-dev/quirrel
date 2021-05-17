module.exports = {
  future: {
    webpack5: true
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/activity",
        permanent: true,
      },
    ];
  },
};
