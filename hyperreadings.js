var fs = require('fs')
var hypergraphCli = require('./index.js')

var path = require('os').homedir() + '/hyper-readings'
var dirs = fs.readdirSync(path).map((name) => {
  return {
    name: name,
    path: path + '/' + name
  }
})

hypergraphCli(dirs, {predicate: 'rdf:type', object: 'hr:root'})
