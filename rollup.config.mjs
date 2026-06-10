import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

const entries = [
  { name: 'index', input: 'src/index.ts' },
  { name: 'server', input: 'src/server.ts' },
];

const jsBuilds = entries.map(({ name, input }) => ({
  input,
  external: [],
  output: [
    {
      file: `dist/${name}.esm.js`,
      format: 'esm',
      sourcemap: true
    },
    {
      file: `dist/${name}.cjs`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    ...(name === 'index'
      ? [{
          file: 'dist/index.umd.js',
          format: 'umd',
          name: 'AchievementsEngine',
          sourcemap: true
        }]
      : [])
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false
    })
  ]
}));

const declarationBuilds = entries.map(({ name, input }) => ({
  input,
  output: {
    file: `dist/${name}.d.ts`,
    format: 'esm'
  },
  plugins: [dts()]
}));

export default [...jsBuilds, ...declarationBuilds];
