module.exports = {
  content: ['./app/**/*.{tsx,ts}', './components/**/*.{tsx,ts}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1e3a5f', light: '#2d5a8e', dark: '#152b47' },
        brand: '#1e3a5f',
      },
    },
  },
}
