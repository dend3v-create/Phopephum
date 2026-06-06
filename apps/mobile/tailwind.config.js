/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#020617', // cosmic-950
        card: '#0A0806',
        primary: '#C6A96B', // gold
        secondary: '#4B6FAE', // mystic blue
        text: '#F8F6F1',
        muted: '#8A8070',
        border: '#2A2018',
        accent: 'rgba(201,169,110,0.15)',
        danger: '#F43F5E',
        success: '#10B981',
      },
      fontFamily: {
        cinzel: ['Cinzel_400Regular', 'Cinzel_700Bold'],
        cormorant: ['CormorantGaramond_400Regular', 'CormorantGaramond_600SemiBold', 'CormorantGaramond_700Bold'],
        thai: ['IBMPlexSansThai_400Regular', 'IBMPlexSansThai_500Medium', 'IBMPlexSansThai_600SemiBold', 'IBMPlexSansThai_700Bold'],
      },
    },
  },
  plugins: [],
};
