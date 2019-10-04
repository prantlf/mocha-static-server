/* eslint-env mocha */
'use strict'

const { strictEqual } = require('assert')
const fs = require('fs')
const pkg = require('../package.json')
const request = require('request')

describe(pkg.name, () => {
  it('responds to a HEAD request', done => {
    const url = 'http://localhost:' + global.port + '/LICENSE'
    request.head(url, (error, response, body) => {
      if (error) {
        return done(error)
      }
      strictEqual(response.statusCode, 200)
      done()
    })
  })

  it('succeeds with a GET request', done => {
    const url = 'http://localhost:' + global.port + '/LICENSE'
    request(url, (error, response, body) => {
      if (error) {
        return done(error)
      }
      strictEqual(response.statusCode, 200)
      strictEqual(body, fs.readFileSync('./LICENSE', { encoding: 'utf-8' }))
      done()
    })
  })

  it('recognizes file still up-to-date in the cache', done => {
    request({
      url: 'http://localhost:' + global.port + '/LICENSE',
      headers: {
        'if-modified-since': new Date().toUTCString()
      }
    }, (error, response, body) => {
      if (error) {
        return done(error)
      }
      strictEqual(response.statusCode, 304)
      done()
    })
  })

  it('fails with a POST request', done => {
    const url = 'http://localhost:' + global.port + '/LICENSE'
    request.post(url, (error, response, body) => {
      if (error) {
        return done(error)
      }
      strictEqual(response.statusCode, 405)
      done()
    })
  })

  it('fails with a missing file', done => {
    const url = 'http://localhost:' + global.port + '/MISSING'
    request(url, (error, response, body) => {
      if (error) {
        return done(error)
      }
      strictEqual(response.statusCode, 404)
      done()
    })
  })
})
