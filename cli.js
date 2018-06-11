var hypergraphCli = require('./index.js')
var minimist = require('minimist')
var fs = require('fs')

var keys = ['subject', 'predicate', 'object']
var argv = minimist(process.argv.slice(2), {string: keys})

var path = argv._[0]
if (!path) {
  exit('Path to hypergraph database is required.')
} else if (!fs.existsSync(path) || !fs.lstatSync(path).isDirectory()) {
  exit('Path not found.') 
}

var query = Object.keys(argv).filter((key) => keys.includes(key)).reduce((obj, key) => {
  obj[key] = argv[key]
  return obj
}, {})

if (Object.keys(query).length < 2) {
  exit('Pass at least 2 out of subject, preciate, object options.')
}

hypergraphCli(path, query)

function exit (msg) {
  console.error(msg)
  process.exit(1)
}