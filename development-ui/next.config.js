module.exports = {
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
