#!/usr/bin/env node

var hypergraphCli = require('./index.js')
var minimist = require('minimist')
var fs = require('fs')

var keys = ['subject', 'predicate', 'object']
var argv = minimist(process.argv.slice(2), {string: keys})

var command = argv._[0]

var dirs, query
if (command === 'hyperreadings') {
  var path = require('os').homedir() + '/hyper-readings'
  if (!fs.existsSync(path)) exit('Hyperreadings not found.')
  dirs = fs.readdirSync(path).map((name) => ({name: name, path: path + '/' + name}))
  query = {predicate: 'rdf:type', object: 'hr:root'}
} else if (command === 'browse') {
  path = argv._[1]
  if (!path) {
    exit('Path to hypergraph database is required.')
  } else if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
    exit('Path not found.')
  }
  dirs = [path]

  query = Object.keys(argv).filter((key) => keys.includes(key)).reduce((obj, key) => {
    obj[key] = argv[key]
    return obj
  }, {})
  if (Object.keys(query).length < 1) {
    exit('Pass at least 1 out of subject, preciate, object options.')
  }
} else {
  usage()
}

hypergraphCli(dirs, query)

function exit (msg) {
  console.error(msg)
  process.exit(1)
}

function usage () {
  console.log(`Usage: hyper-graph-cli COMMAND [args] [options]

Browse a hyper-graph-db by path:

 $ hyper-graph-cli browse PATH [options]

  where PATH is the path to a hyper-graph database directory.
  Pass at least one out of the three query options:

  --subject
  --predicate
  --object

   This sets the properties of the root query.

Browse installed hyperreadings databases:

 $ hyper-graph-cli hyperreadings

  This assumes that databases created or shared via
  hyper-reader are to be found in $HOME/hyper-readings.
`)
  process.exit(0)
}
