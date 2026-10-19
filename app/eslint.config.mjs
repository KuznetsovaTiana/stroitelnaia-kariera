
import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        location: 'readonly',
        TextEncoder: 'readonly',
        localStorage: 'readonly',
        document: 'readonly',
        Storage: 'readonly',
        DOMException: 'readonly',
        URL: 'readonly'
      }
    }
  }
);
