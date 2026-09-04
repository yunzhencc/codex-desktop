import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    semi: true,
    indent: 2,
    quotes: 'single',
  },
  ignores: [
    'docs/**',
    'src-tauri/**',
    'packages/shadcn-ui/src/components/**',
  ],
  jsonc: false,
  react: true,
}, {
  files: ['packages/**/*.tsx'],
  rules: {
    'react-refresh/only-export-components': 'off',
  },
});
