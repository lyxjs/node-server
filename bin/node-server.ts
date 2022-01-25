import minimist from 'minimist'
import path from 'path'
import fs from 'fs'
import { Options, useport, createServer } from '../src/node-server'
const argv = minimist(process.argv.slice(2))
let options: Options = {}

async function main() {
  if (argv.c) {
    let url: string
    if (argv.c === true) {
      url = path.resolve(process.cwd(), 'node-server.conf.js')
    } else {
      url = path.resolve(process.cwd(), argv.c as string)
    }
    const statsObj = fs.statSync(url)
    if (statsObj.isFile()) {
      const { default: config } = (await import(url)) as { default: Options }
      options = config
    }
  }

  if (typeof argv.p !== 'number') {
    argv.p = undefined
  }

  if (argv.p === undefined && options.port !== undefined) {
    options.port = await useport(options.port)
  }

  const server = createServer(options)

  server.listen(argv.p as number)
}

main().catch(null)
