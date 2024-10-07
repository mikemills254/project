/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./Screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00e5e5",
        "primary-content": "#000000",
        "primary-dark": "#00b2b2",
        "primary-light": "#19ffff",

        secondary: "#7200e5",
        "secondary-content": "#f2e5ff",
        "secondary-dark": "#5900b2",
        "secondary-light": "#8b19ff",

        background: "#eff1f1",
        foreground: "#fbfbfb",
        border: "#dde2e2",

        copy: "#232929",
        "copy-light": "#5e6e6e",
        "copy-lighter": "#849595",

        success: "#00e500",
        warning: "#e5e500",
        error: "#e50000",

        "success-content": "#000000",
        "warning-content": "#000000",
        "error-content": "#ffe5e5"
    },
    },
  },
  plugins: [],
}

