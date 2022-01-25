import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
// import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import copy from 'rollup-plugin-copy'

import pkg from './package.json'

const libraryName = 'node-server'

export default [
  {
    input: `src/${libraryName}.ts`,
    output: [
      { file: pkg.module, format: 'cjs', sourcemap: true }
    ],
    watch: {
      include: 'src/**'
    },
    plugins: [
      json(),
      typescript({ useTsconfigDeclarationDir: true }),
      commonjs(),
      resolve(),
      sourceMaps(),
      copy({
        targets: [
          {
            src: 'src/404.html',
            dest: 'dist',
            transform: (contents) => {
              return contents.toString()
                .replace('__NAME__', pkg.name)
                .replace('__VERSION__', pkg.version)
            }
          }
        ]
      })
    ]
  },
  {
    input: `bin/${libraryName}.ts`,
    output: [
      {
        file: pkg.bin["node-server"],
        format: 'cjs',
        sourcemap: true,
        banner: '#!/usr/bin/env node',
      }
    ],
    watch: {
      include: 'bin/**'
    },
    plugins: [
      json(),
      typescript({ useTsconfigDeclarationDir: true }),
      commonjs(),
      resolve(),
      sourceMaps()
    ]
  }
]
