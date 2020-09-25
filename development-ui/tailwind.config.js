module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: ["./**/*.[tj]s?(x)"],
  theme: {
    extend: {
      colors: {
        white: "#fffdf8",
      }
    },
  },
  variants: {},
  plugins: [],
};
