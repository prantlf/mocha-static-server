'use strict'

const { createReadStream, stat } = require('fs')
const { createServer, STATUS_CODES } = require('http')
const { getType } = require('mime')
const { join } = require('path')
const { URL } = require('url')
const { promisify } = require('util')

const statAsync = promisify(stat)

const minimumPort = 49152
const maximumPort = 65535
let port = minimumPort

const handler = wrapAwaitHandler(serveFile)
const server = createServer(handler)

function getFileHeaders (path, stats) {
  const now = new Date()
  return {
    'content-type': getType(path) || 'application/octet-stream',
    'content-length': stats.size,
    'last-modified': stats.mtime.toUTCString(),
    date: now.toUTCString(),
    expires: new Date(now.getTime() + 5000).toUTCString(),
    'cache-control': 'public, max-age=5'
  }
}

function reportError (response, error) {
  const message = error.message
  const content = Buffer.from(message, 'utf-8')
  console.log(error.message)
  const status = error.code === 'ENOENT' ? 404
    : error.code === 'EACCES' ? 403
      : error.code === 'EISDIR' ? 400
        : error.code === 'ENOIMP' ? 405 : 500
  response.writeHead(status, STATUS_CODES[status], {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': content.length
  })
  response.end(content)
}

async function serveFile (request, response) {
  const method = request.method
  const head = method === 'HEAD'
  if (!(head || method === 'GET')) {
    const error = new Error('Unsupported method "' + method + '".')
    error.code = 'ENOIMP'
    return reportError(response, error)
  }
  const { pathname } = new URL(request.url, 'http://localhost')
  const path = join('.', pathname)
  const stats = await statAsync(path)
  if (head) {
    response.writeHead(200)
    return response.end()
  }
  const modifiedTime = stats.mtime
  const cachedTime = request.headers['if-modified-since']
  modifiedTime.setMilliseconds(0)
  if (cachedTime && new Date(cachedTime) >= modifiedTime) {
    response.writeHead(304)
    response.end()
  } else {
    response.writeHead(200, getFileHeaders(path, stats))
    const stream = createReadStream(path)
    stream
      .on('error', reportError.bind(null, response))
      .pipe(response)
  }
}

function wrapAwaitHandler (handler) {
  return async (request, response) => {
    try {
      await handler(request, response)
    } catch (error) {
      reportError(response, error)
    }
  }
}

function start () {
  server.listen(port, '0.0.0.0')
}

function retry (error) {
  if (error.code === 'EADDRINUSE') {
    port = nextPort()
    if (port < maximumPort) {
      console.log(`Port ${port} not free, trying a higher one.`)
      return
    }
    error = new Error('No free port available.')
  }
  return error
}

function nextPort () {
  return port === minimumPort ? port + 10 : port + 1
}

module.exports = new Promise((resolve, reject) => {
  server
    .on('listening', () => {
      console.log(`Web server listening on port ${port}.`)
      resolve(server)
    })
    .on('error', error => {
      error = retry(error)
      if (error) {
        reject(error)
      } else {
        setTimeout(start, 250)
      }
    })
    .on('close', () => {
      console.log(`Web server on port ${port} stopped.`)
    })

  start()
})
