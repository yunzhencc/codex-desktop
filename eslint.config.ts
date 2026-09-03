import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    semi: true,
    indent: 2,
    quotes: 'single',
  },
  ignores: [
    'src-tauri/**',
    'src/components/ui/**',
  ],
  jsonc: false,
  react: true,
});
