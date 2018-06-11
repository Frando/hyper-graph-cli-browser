var neatLog = require('neat-log')
var chalk = require('chalk')
var blit = require('txt-blit')
var hg = require('hyper-graph-db')
var C = require('./src/cli-utils.js')
var Tree = require('./src/tree.js')
var path = require('path');

function HrDebug (dbs, query) {
  if (!Array.isArray(dbs)) return HrDebug([dbs], query)
  var self = this

  this.dbs = dbs.map((db) => typeof db === 'object' ? db : {name: path.parse(db).base, path: db})
  console.log(this.dbs)
  this.query = query

  // Init neat
  this.neat = neatLog(view, {fullscreen: true})
  this.neat.use(init)

  // Init widgets (todo)
  var bLog = new C.Box(this.neat)

  // Init input
  this.neat.input.on('down', () => {
    if (self.state.mode === 'select') {
      self.state.selected = self.state.selected + 1
      if (self.state.selected > self.state.selection.length - 1) self.state.selected = 0
    } else if (self.state.mode === 'browse') {
      self.state.tree.down()
    }
  })

  this.neat.input.on('up', () => {
    if (self.state.mode === 'select') {
      self.state.selected = self.state.selected - 1
      if (self.state.selected < 0) self.state.selected = self.state.selection.length - 1
    } else if (self.state.mode === 'browse') {
      self.state.tree.up()
    }
  })

  this.neat.input.on('enter', () => {
    if (self.state.mode === 'select') {
      browse(self.state.selection[self.state.selected])
    } else if (self.state.mode === 'browse') {
      self.state.tree.enter()
    }
  })

  this.neat.input.on('keypress', (ch, key) => {
    if (key && key.name === 'escape') {
      self.state.mode = 'select'
    }

    if (key && key.name === 'l') {
      self.state.showLog = !self.state.showLog
    }
    self.bus.emit('render')
  })

  function init (state, bus) {
    self.bus = bus
    self.state = Object.assign(state, {
      mode: 'select',
      selected: 0,
      scroll: 0,
      log: [],
      showLog: false,
      selection: self.dbs.map((obj) => obj.name)
    })

    if (self.state.selection.length === 1) {
      browse(self.state.selection[self.state.selected])
    }
    bus.emit('render')
  }

  function view (state) {
    var lines = []
    lines.push('HyperGraph CLI Browser')
    lines.push('')

    if (state.mode === 'select') {
      lines.push('Select a database:')
      lines.push('')
      state.selection.forEach((line, idx) => {
        if (idx === state.selected) lines.push(chalk.red('* ' + line))
        else lines.push('  ' + line)
      })
    }

    if (state.mode === 'browse') {
      lines.push('Browsing ' + state.selection[state.selected])
      lines.push('')
      if (state.tree) lines = lines.concat(state.tree.render())
    }

    var screen = []
    var size = [process.stdout.columns, process.stdout.rows]

    var mainBox = C.formatLines(lines, {border: false})
    blit(screen, mainBox, 0, 0)

    if (state.showLog) {
      var box = bLog.render(state.log, {cols: size[0] - 10, rows: size[1] - 10, border: true})
      blit(screen, box, 5, 5)
    }

    return screen.join('\n')
  }

  function browse (name) {
    self.state.mode = 'browse'
    var path = self.dbs.filter((obj) => obj.name === name)[0].path
    if (self.path !== path) {
      self.path = path
      self.graph = hg(path, {valueEncoding: 'utf-8'})
      self.graph.on('ready', () => {
        self.state.tree = new Tree(self.graph, self.query)
        self.state.tree.on('log', (msg) => {
          log(msg)
        })
        self.state.tree.on('update', () => self.bus.emit('render'))
      })
    }
  }

  function log (line) {
    self.state.log.push(line)
    self.bus.emit('render')
  }

}

module.exports = HrDebug
