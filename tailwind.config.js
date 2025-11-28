module.exports = {
  content: [
    "./index.html",
    "./assets/js/**/*.js",
    "./components/**/*.{html,js}",
    "./src/**/*.{html,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
