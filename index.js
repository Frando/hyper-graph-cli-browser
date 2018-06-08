var fs = require('fs')
var neatLog = require('neat-log')
var chalk = require('chalk')
var blit = require('txt-blit')
var hg = require('hyper-graph-db')
var C = require('./src/cli-utils.js')
var Tree = require('./src/tree.js')

function HrDebug () {
  var self = this
  this.neat = neatLog(view, {fullscreen: true})
  this.neat.use(init)

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
      self.state.mode = 'browse'
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
    self.state = Object.assign(state, {
      mode: 'select',
      selected: 0,
      scroll: 0,
      log: [],
      showLog: false
    })
    self.bus = bus
    var path = require('os').homedir() + '/hyper-readings'
    self.state.dirs = self.state.selection = fs.readdirSync(path)
    bus.emit('render')
  }

  function view (state) {
    var lines = []
    lines.push('HyperReadings CLI Browser')
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
      var box = C.formatLines(state.log, {
        rows: size[1] - 10,
        cols: size[0] - 10,
        border: true,
        color: 'yellow'
      })
      blit(screen, box, 5, 5)
    }

    return screen.join('\n')
  }

  function log (line) {
    self.state.log.push(line)
    self.bus.emit('render')
  }

  function browse (name) {
    var path = require('os').homedir() + '/hyper-readings/' + name
    if (self.path !== path) {
      self.path = path
      self.graph = hg(path, {valueEncoding: 'utf-8'})
      self.graph.on('ready', () => {
        // self.state.tree = new TripleTree(self.graph, self.bus, log)
        self.state.tree = new Tree(self.graph, self.bus, log)
        self.state.tree.on('log', (msg) => {
          log(msg)
        })
        self.state.tree.on('update', () => self.bus.emit('render'))
      })
    }
  }
}

module.exports = HrDebug
HrDebug()
