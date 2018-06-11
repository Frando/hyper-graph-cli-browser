var events = require('events')
var util = require('util')
var chalk = require('chalk')

module.exports = TripleTree

function TripleTree (graph, query) {
  if (!(this instanceof TripleTree)) return new TripleTree(graph)
  events.EventEmitter.call(this)
  this.graph = graph

  this.tree = []
  this.cur = this.tree

  this.graph.get(query, (err, nodes) => {
    if (err) return
    this.tree = nodes.map((node) => {
      node._root = true
      node.predicate = node.object = null
      return node
    })
    this.cur = this.tree[0]
    this.update()
  })
}
util.inherits(TripleTree, events.EventEmitter)

TripleTree.prototype.log = function (msg) {
  this.emit('log', msg)
}

TripleTree.prototype.update = function () {
  this.emit('update')
}

TripleTree.prototype.loadChildren = function (node, cb) {
  var subject = node._root ? node.subject : node.object
  this.graph.get(spo(subject), (err, nodes) => {
    if (err) return
    node.children = nodes.map((n) => {
      n.parent = node
      if (n.predicate === 'rdf:type') n._skip = true
      return n
    }).sort((a, b) => a.predicate > b.predicate)
    this.update()
    if (cb) cb()
  })
}

TripleTree.prototype.up = function () {
  var idx
  var found = false
  if (this.cur._root) {
    idx = this.tree.findIndex((n) => same(n, this.cur))
    if (idx > 0) found = this.tree[idx]
  }
  if (!found && !this.cur.parent) return
  if (!found) {
    idx = this.cur.parent.children.findIndex((n) => same(n, this.cur)) - 1
    while (idx >= 0 && !found) {
      if (check(this.cur.parent.children[idx])) found = this.cur.parent.children[idx]
      idx--
    }
  }
  if (found) this.cur = found
  else this.cur = this.cur.parent
  this.update()
}

TripleTree.prototype.down = function () {
  var node = findChild(this.cur)
  if (!node) node = next(this.tree, this.cur)
  if (node) this.cur = node
  this.update()

  function next (tree, node) {
    var idx
    if (node.parent) {
      idx = node.parent.children.findIndex((n) => same(n, node))
      for (var i = idx + 1; i < node.parent.children.length; i++) {
        if (check(node.parent.children[i])) return node.parent.children[i]
      }
      return next(tree, node.parent)
    }
    else if (node._root) {
      idx = tree.findIndex((n) => same(n, node))
      if (tree[idx + 1]) return tree[idx + 1]
    }
    return false
  }
}

TripleTree.prototype.enter = function () {
  var self = this
  if (!this.cur.loaded) {
    this.loadChildren(this.cur, cb)
  }
  this.cur._open = !this.cur._open
  this.update()

  function cb () {
    self.cur.children.forEach((obj) => self.loadChildren(obj))
  }

}

TripleTree.prototype.render = function () {
  var self = this
  var out = []
  walk(this.tree, this.cur, 0)
  return out

  function walk (tree, cur, level) {
    for (var idx = 0; idx < tree.length; idx++) {
      if (tree[idx]._skip) continue
      out.push(self.formatLine(tree[idx], {indent: level * 2, sel: same(cur, tree[idx])}))
      if (tree[idx].children && tree[idx]._open) walk(tree[idx].children, cur, level + 1)
    }
  }

}

TripleTree.prototype.formatLine = function (node, opts) {
  opts = Object.assign({
    indent: 0,
    sel: false,
    cols: process.stdout.columns,
    format: opts.indent ? 'prop' : 'subject'
  }, opts)

  var str = ''
  var cols = opts.cols - opts.indent - 4

  var len
  var type = getFirst(node, 'rdf:type')
  if (type) type = '~' + chalk.green(type)
  else type = ''

  var parts
  if (opts.format === 'triple') {
    parts = [node.subject, node.predicate, node.object]
    len = parts.reduce((sum, el) => sum + (el && el.length ? el.length : 0), 0)
    if (len > opts.cols - opts.indent - 5) {
      parts = parts.map((val) => val.substr(0, Math.floor((opts.cols / 3) - 1)))
    }
    str += parts.join(' ')
  }
  if (opts.format === 'subject') {
    len = node.subject.length + type.length + 2
    str += chalk.yellow(node.subject.substr(0, len > cols ? cols - type.length : 999)) + type
  } else if (opts.format === 'prop') {
    var obColor = node.object.substr(0, 1) === '"' ? 'blue' : 'yellow'
    len = node.object.length + node.predicate.length + type.length + 2
    str += chalk.red(node.predicate) + ' ' +
      chalk[obColor](node.object.substr(0, len > cols ? cols - node.predicate.length : 999)) + type
  }
  return ' '.repeat(opts.indent) + (opts.sel ? '* ' : '  ') + str
}

function spo (s, p, o) {
  return {
    subject: s,
    predicate: p,
    object: o
  }
}

function pos (p, o, s) {
  return spo(s, p, o)
}

function same (n1, n2) {
  return n1.subject === n2.subject && n1.object === n2.object && n1.predicate === n2.predicate
}

function getAll (node, type) {
  if (!node.children) return []
  return node.children.filter((n) => n.predicate === type)
}

function getFirst (node, type) {
  var els = getAll(node, type)
  if (els[0]) return els[0].object
}

function findChild (node) {
  if (!node._open || !node.children || !node.children.length) return false
  for (var i = 0; i < node.children.length; i++) {
    if (check(node.children[i])) return node.children[i]
  }
  return false
}

function check (node) {
  return !node._skip
}