import vue from 'eslint-plugin-vue'
import vueTs from '@vue/eslint-config-typescript'

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'src/typed-router.d.ts',
      'src/auto-imports.d.ts',
    ],
  },
  ...vue.configs['flat/recommended'],
  ...vueTs(),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
