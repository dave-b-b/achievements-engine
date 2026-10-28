import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import ts from 'typescript';

// TypeScript 5.9 can retain pending updates after closing a watch compiler.
// Cancel those updates so they cannot recreate watchers after a one-off build.
const compiler = {
  ...ts,
  createWatchProgram(host) {
    const pendingTimers = new Set();
    const watchHost = {
      ...host,
      setTimeout(callback, delay, ...args) {
        const timer = host.setTimeout((...values) => {
          pendingTimers.delete(timer);
          callback(...values);
        }, delay, ...args);
        pendingTimers.add(timer);
        return timer;
      },
      clearTimeout(timer) {
        pendingTimers.delete(timer);
        host.clearTimeout(timer);
      },
    };
    const program = ts.createWatchProgram(watchHost);
    const close = program.close.bind(program);
    program.close = () => {
      for (const timer of pendingTimers) watchHost.clearTimeout(timer);
      close();
    };
    return program;
  },
};

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
      typescript: compiler,
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
