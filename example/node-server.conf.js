module.exports = {
  port: 8080,
  root: 'example',
  autoindex: 'on',
  index: ['index.html', 'index.htm'],
  errorPage: 'demo/404.html',
  proxy:  {
    '/example/': 'http://localhost:8081'
  },
  https: true,
  key: 'key.pem',
  cert: 'cert.pem'
}
