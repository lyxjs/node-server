import http from 'http'
import https from 'https'
import path from 'path'
import fs from 'fs'
import net from 'net'
import colors from 'colors'

export interface Options {
  port?: number
  root?: string
  autoindex?: 'on' | 'off'
  index?: string[]
  errorPage?: string
  proxy?: { [baseurl: string]: string }
  https?: boolean
  key?: string
  cert?: string
}

abstract class Server {
  protected _server: http.Server
  protected _port = 8080
  protected _root = '.'
  protected _autoindex: 'on' | 'off' = 'on'
  protected _index: string[] = ['index.html', 'index.htm']
  protected _errorPage: string | null = null
  protected _proxy: { [baseurl: string]: string } | null = null
  protected _contentTypeMaps: { [extname: string]: string } = {}
  protected _filepath = ''
  protected _https = false
  protected _key = ''
  protected _cert = ''

  constructor(options: Options) {
    if (options.port !== undefined) this._port = options.port
    if (options.root !== undefined) this._root = options.root
    if (options.autoindex !== undefined) this._autoindex = options.autoindex
    if (options.index !== undefined) this._index = options.index
    if (options.errorPage !== undefined) this._errorPage = options.errorPage
    if (options.proxy !== undefined) this._proxy = options.proxy
    if (options.https !== undefined) this._https = options.https
    if (options.key !== undefined) this._key = options.key
    if (options.cert !== undefined) this._cert = options.cert

    this._server = this._createServer()

    this.defineContentType('.js', 'application/javascript')
    this.defineContentType('.html', 'text/html; chartset=utf-8')
    this.defineContentType('.htm', 'text/html; chartset=utf-8')
    this.defineContentType('.css', 'text/css')
    this.defineContentType('.json', 'application/json; chartset=utf-8')
    this.defineContentType('.txt', 'text/plain')
    this.defineContentType('.xml', 'text/xml')
    this.defineContentType('.jpeg', 'image/jpeg')
    this.defineContentType('.jpg', 'image/jpeg')
    this.defineContentType('.png', 'image/png')
    this.defineContentType('.svg', 'image/svg+xml')
    this.defineContentType('.pdf', 'application/pdf')
    this.defineContentType('.ppt', 'application/vnd.ms-powerpoint')
    this.defineContentType(
      '.pptx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
    this.defineContentType('.xls', 'application/vnd.ms-excel')
    this.defineContentType(
      '.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    this.defineContentType('.ttf', 'font/ttf')
    this.defineContentType('.tif', 'image/tiff')
    this.defineContentType('.tiff', 'image/tiff')
    this.defineContentType('.vsd', 'application/vnd.visio')
    this.defineContentType('.wav', 'audio/wav')
    this.defineContentType('.weba', 'audio/webm')
    this.defineContentType('.webm', 'video/webm')
    this.defineContentType('.webp', 'image/webp')
    this.defineContentType('.woff', 'font/woff')
    this.defineContentType('.woff2', 'font/woff2')
    this.defineContentType('.xhtml', 'application/xhtml+xml')
    this.defineContentType('.oga', 'audio/ogg')
    this.defineContentType('.ogv', 'video/ogg')
    this.defineContentType('.ogx', 'application/ogg')
    this.defineContentType('.otf', 'font/otf')
    this.defineContentType('.mp3', 'audio/mpeg')
    this.defineContentType('.mpeg', 'video/mpeg')
    this.defineContentType('.mjs', 'text/javascript')
    this.defineContentType('.ico', 'image/vnd.microsoft.icon')
    this.defineContentType('.mid', 'audio/midi')
    this.defineContentType('.midi', 'audio/x-midi')
    this.defineContentType('.doc', 'application/msword')
    this.defineContentType(
      '.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    this.defineContentType('.csv', 'text/csv')
    this.defineContentType('.arc', 'application/x-freearc')
    this.defineContentType('.abw', 'application/x-abiword')
    this.defineContentType('.md', 'text/markdown; charset=UTF-8')
  }

  public close() {
    this._server.close()
  }

  public abstract listen(port: number): void

  private _createServer() {
    if (this._https) {
      const credentials: { [x: string]: unknown } = {}
      if (this._key) {
        credentials.key = fs.readFileSync(path.join(process.cwd(), this._key))
      }
      if (this._cert) {
        credentials.cert = fs.readFileSync(path.join(process.cwd(), this._cert))
      }
      return https.createServer(credentials, this._requestHandler)
    }
    return http.createServer(this._requestHandler)
  }

  /**
   * 获取url
   * @param request
   * @returns
   */
  private _setFilepath(request: http.IncomingMessage) {
    const baseurl = process.cwd()
    const originalUrl = request.url || ''
    this._filepath = path.join(baseurl, this._root, originalUrl)
    return this._filepath
  }

  private _getFilepath() {
    return this._filepath
  }

  /**
   * 处理所有请求
   * @param request
   * @param response
   * @returns
   */
  private _requestHandler = (request: http.IncomingMessage, response: http.ServerResponse) => {
    if (this._proxyHandler(request, response)) return
    const filepath = this._setFilepath(request)
    const originalUrl = request.url || ''
    fs.stat(filepath, (err: NodeJS.ErrnoException | null, stat: fs.Stats) => {
      if (err) {
        this._senderror(response, err)
      } else if (stat.isDirectory()) {
        if (originalUrl[originalUrl.length - 1] !== '/') {
          this._sendLocation(response, originalUrl)
        } else {
          this._senddirectory(request, response)
        }
      } else if (stat.isFile()) {
        this._sendfile(response, filepath)
      }
    })
  }

  /**
   * 转发请求
   * @param request
   * @param response
   * @returns
   */
  private _proxyHandler(request: http.IncomingMessage, response: http.ServerResponse) {
    if (this._proxy === null) return
    if (!request.url) return
    const originalUrl = request.url
    let targetUrl: string | undefined
    for (const key in this._proxy) {
      if (originalUrl.indexOf(key) === 0) {
        targetUrl = this._proxy[key]
        break
      }
    }
    if (!targetUrl) return

    const urlconfig: URL = new URL(targetUrl)
    const options: http.RequestOptions = {
      hostname: urlconfig.hostname,
      port: Number(urlconfig.port),
      path: originalUrl,
      method: request.method,
      headers: request.headers,
    }
    const proxy = http.request(options, function (res: http.IncomingMessage): void {
      response.writeHead(res.statusCode || 404, res.headers)
      res.pipe(response, {
        end: true,
      })
    })
    request.pipe(proxy, {
      end: true,
    })
    return true
  }

  /**
   * 返回错误
   * @param response
   * @param err
   */
  private _senderror(response: http.ServerResponse, err: NodeJS.ErrnoException): void {
    switch (err.code) {
      case 'ENOENT':
        this._send404(response)
        break
      case 'EACCES':
        response.writeHead(403, { 'Content-Type': 'text/plain;charset=utf-8' })
        response.write('禁止访问，服务器收到请求，但是拒绝提供服务')
        response.end()
        break
    }
  }

  /**
   * 返回404
   * @param response
   */
  private _send404(response: http.ServerResponse) {
    let errorurl: string
    if (this._errorPage) {
      errorurl = path.join(process.cwd(), this._errorPage)
    } else {
      errorurl = path.join(__dirname, '404.html')
    }
    this._sendfile(response, errorurl, 404)
  }

  /**
   * 返回文件
   * @param response
   * @param url
   * @param statusCode
   */
  private _sendfile(response: http.ServerResponse, filepath: string, statusCode?: number) {
    const extname: string = path.extname(filepath)
    const contentType = this.getContentType(extname)
    if (contentType !== null) {
      response.writeHead(statusCode || 200, { 'Content-Type': contentType })
    } else {
      response.writeHead(statusCode || 200, { 'Content-Type': 'octet-stream' })
    }
    fs.createReadStream(filepath).pipe(response)
  }

  /**
   * 返回文件夹
   */
  private _senddirectory(request: http.IncomingMessage, response: http.ServerResponse) {
    const filepath = this._getFilepath()
    const originalUrl = request.url || ''
    const readDir: string[] = fs.readdirSync(filepath)
    const indexFile = this._index.find((filename) => readDir.includes(filename))
    if (indexFile) {
      this._sendfile(response, path.join(filepath, indexFile))
    } else if (this._autoindex === 'on') {
      response.writeHead(200, { 'Content-Type': 'text/html; chartset=utf-8' })
      response.write(this.gethtml(filepath, readDir, originalUrl))
      response.end()
    } else {
      this._send404(response)
    }
  }

  /**
   * 重定向
   * @param response
   * @param url
   */
  private _sendLocation(response: http.ServerResponse, url: string): void {
    response.writeHead(301, { Location: url + '/' })
    response.end()
  }

  protected getContentType(extname: string): string | null {
    return this._contentTypeMaps[extname] || null
  }

  protected defineContentType(extname: string, contentType: string) {
    this._contentTypeMaps[extname] = contentType
  }

  protected gethtml(filepath: string, list: Array<unknown>, originalurl: string) {
    let html = '<html><head><meta charset="utf-8"/></head><body>'
    html += '<h1>Index Of ' + originalurl + '</h1><hr/><pre>'

    let namemax = -Infinity

    const curList = list
      // eslint-disable-next-line no-useless-escape
      .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item as string))
      .map((v) => {
        const stat = fs.statSync(path.join(filepath, v as string))
        namemax = Math.max(namemax, (v as string).length)
        return {
          name: v as string,
          mtime: stat.mtime,
          time: stat.mtime.getTime(),
          isDirectory: stat.isDirectory(),
          size: stat.size,
        }
      })
      .sort((a, b) => {
        return a.time - b.time
      })
      .sort((a, b) => {
        return a.isDirectory && !b.isDirectory ? -1 : 1
      })

    let content = '<a href="../">../</a>\n'
    for (let i = 0; i < curList.length; i++) {
      const dir = curList[i].isDirectory ? '/' : ''
      const emptycount = namemax - `${curList[i].name}${dir}`.length + 32
      const size: string = curList[i].isDirectory ? '-' : String(curList[i].size)
      content += `<a href="${curList[i].name}${dir}">${curList[i].name}${dir}</a>`
      content += new Array(emptycount).join(' ')
      content += `${curList[i].mtime.toISOString().replace(/T/, ' ').replace(/\..+/, '')}`
      content += new Array(16).join(' ') + size + '\n'
    }
    html += content
    html += '</pre><hr/></body></html>'
    return html
  }
}

export class NodeServer extends Server {
  listen(port?: number): void {
    if (port === undefined) port = this._port
    this._server.listen(port)
    const protocol = this._https ? 'https://' : 'http://'
    console.log(colors.blue(`${protocol}localhost:${port as unknown as string}`))
  }
}

export function createServer(options: Options) {
  return new NodeServer(options)
}

export async function useport(port: number): Promise<number> {
  return new Promise(function (resolve) {
    const server: net.Server = net.createServer()
    server
      .on('listening', function (): void {
        server.close()
        resolve(port)
      })
      .on('error', function (err: NodeJS.ErrnoException): void {
        if (err.code === 'EADDRINUSE') {
          useport((port += 1))
            .then(function (result: number): void {
              resolve(result)
            })
            .catch(undefined)
        }
      })
      .listen(port, '0.0.0.0')
  })
}
