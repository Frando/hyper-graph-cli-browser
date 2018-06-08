var events = require('events')
var util = require('util')

var chalk = require('chalk')

module.exports = TripleTree

function TripleTree (graph) {
  if (!(this instanceof TripleTree)) return new TripleTree(graph)
  events.EventEmitter.call(this)
  this.graph = graph

  this.tree = []
  this.cur = this.tree

  this.log('start')

  this.graph.get(pos('rdf:type', 'hr:root'), (err, nodes) => {
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

TripleTree.prototype.loadChildren = function (subject) {
  this.graph.get(spo(subject), (err, nodes) => {
    if (err) return
    this.cur.children = nodes.map((node) => {
      node.parent = this.cur
      return node
    })
    this.update()
  })
}

TripleTree.prototype.up = function () {
  var idx
  if (this.cur._root) {
    idx = this.tree.findIndex((n) => n.subject === this.cur.subject)
    if (idx > 0) this.cur = this.tree[idx]
  }

  if (!this.cur.parent) return

  idx = this.cur.parent.children.findIndex((n) => same(n, this.cur))
  if (idx > 0) this.cur = this.cur.parent.children[idx - 1]
  else this.cur = this.cur.parent

  this.update()
}

TripleTree.prototype.down = function () {
  if (this.cur._open && this.cur.children && this.cur.children.length) {
    this.cur = this.cur.children[0]
  } else if (this.cur.parent) {
    var idx = this.cur.parent.children.findIndex((n) => same(n, this.cur))
    if (idx < this.cur.parent.children.length - 1) this.cur = this.cur.parent.children[idx + 1]
    else {
      var node = this.cur.parent
      while (true) {
        if (!node.parent) return
        idx = node.parent.children.findIndex((n) => same(n, node))
        if (node.parent.children[idx]) {
          this.cur = node.parent.children[idx + 1]
        }
        node = node.parent
      }
    }
  }
  this.update()
}

TripleTree.prototype.enter = function () {
  if (!this.cur.loaded) {
    this.loadChildren(this.cur._root ? this.cur.subject : this.cur.object)
  }
  this.cur._open = !this.cur._open
  this.update()
}

TripleTree.prototype.render = function () {
  var out = []
  walk(this.tree, this.cur, 0)
  return out

  function walk (tree, cur, level) {
    for (var idx = 0; idx < tree.length; idx++) {
      out.push(formatLine(tree[idx], level * 2, same(cur, tree[idx])))
      if (tree[idx].children && tree[idx]._open) walk(tree[idx].children, cur, level + 1)
    }
  }

  function formatLine (node, indent, sel) {
    var str
    var cols = process.stdout.columns - indent - 4

    if (!indent) {
      str = chalk.yellow(node.subject)
    } else {
      var len = node.object.length + node.predicate.length + 2
      str = chalk.red(node.predicate) + ' ' +
        chalk.blue(node.object.substr(0, len > cols ? cols - node.predicate.length : 999))
    }
    return ' '.repeat(indent) + (sel ? '* ' : '  ') + str
  }
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
