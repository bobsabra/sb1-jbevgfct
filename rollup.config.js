import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve'; // Import the resolve plugin

export default {
  input: 'src/tracker/index.ts',
  output: {
    file: 'dist/tracker.js',
    format: 'iife',
    name: 'AttributionTracker',
    sourcemap: true
  },
  plugins: [
    resolve(), // Add the resolve plugin
    typescript({
      tsconfig: './tsconfig.tracker.json',
      compilerOptions: {
        declaration: false,
      }
    }),
    terser()
  ]
};
