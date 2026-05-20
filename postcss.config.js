/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const tailwindcss = require('tailwindcss')
const autoprefixer = require('autoprefixer')

module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss,
    autoprefixer
  }
}
