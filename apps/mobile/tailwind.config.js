/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#020617',
        cosmic: {
          950: '#020617',
          900: '#071427',
          800: '#0A2240',
          700: '#12355B',
        },
        gold: {
          500: '#C6A96B',
          400: '#D9BC82',
          300: '#F2D49B',
          liquid: '#E8C46A',
        },
        mystic: {
          500: '#4B6FAE',
          400: '#6D8FC7',
          300: '#9AB3D9',
        },
        text: {
          primary: '#F8F6F1',
          secondary: '#D9CDB7',
          muted: '#94A3B8',
        },
        danger: '#F43F5E',
        success: '#10B981',
      },
      fontFamily: {
        cinzel: ['Cinzel_400Regular', 'Cinzel_700Bold'],
        cormorant: ['CormorantGaramond_400Regular', 'CormorantGaramond_600SemiBold', 'CormorantGaramond_700Bold'],
        thai: ['IBMPlexSansThai_400Regular', 'IBMPlexSansThai_500Medium', 'IBMPlexSansThai_600SemiBold', 'IBMPlexSansThai_700Bold'],
        prompt: ['Prompt_400Regular', 'Prompt_500Medium', 'Prompt_600SemiBold', 'Prompt_700Bold'],
      },
    },
  },
  plugins: [],
};
