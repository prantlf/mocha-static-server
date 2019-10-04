'use strict'

const prepare = require('mocha-prepare')

let server

prepare(function (done) {
  require('./server')
    .then(result => {
      server = result
      global.port = server.address().port
      done()
    }, error => done(error))
}, function (done) {
  server.close(error => done(error))
})
