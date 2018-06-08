var chalk = require('chalk')

function Box (bus, input) {
  if (!(this instanceof Box)) return new Box()
  this.bus = bus
  this.scrollback = 0

  input.on('down', () => { if (this.active) this.scroll(1) } )
  input.on('up', () => { if (this.active) this.scroll(-1) } )
}

Box.prototype.scroll = function(idx) {
  this.scrollback = this.scrollback + idx
  if (this.scrollback < 0) this.scrollback = 0
  this.bus.emit('render')
}

Box.prototype.select = function(idx) {
  this.scrollback = this.scrollback + idx
  if (this.scrollback < 0) this.scrollback = 0
  this.bus.emit('render')
}

Box.prototype.render = function (lines, opts) {
  opts = opts || {}
  opts.scrollback = opts.scrollback || this.scrollback || 0
  var out = []
  var cols = opts.cols || process.stdout.columns
  var rows = opts.rows || process.stdout.rows

  if (opts.border) {
    cols = cols - 4
    rows = rows - 4
  }

  var out = []
  for (var i = 0, len = lines.length; i < len; i++) {
    add(lines[i])
  }

  if (opts.scrollback > lines.length - rows) opts.scrollback = this.scrollback = lines.length - rows
  var start, end
  if (opts.reverse) {
    start = lines.length - opts.scrollback - rows
    end   = lines.length - opts.scrollback
    if (start < 0) start = 0
  }
  else {
    start = opts.scrollback
    end   = opts.scrollback + rows
  }

  out = out.slice(start, end)

  if (out.length < rows) {
    out = out.concat(Array(rows - out.length).fill(formatLine('', cols, opts)))
  }

  if (opts.border) {
    var bl = chalk.grey('+' + '-'.repeat(cols + 2) + '+')
    out = [bl].concat(out, [bl])
  }

  return out

  function add (line) {
    if (typeof line === 'object') {
      try {
        line = JSON.stringify(line)
      }
      catch (e) {
        line = '[Object object]'
      }
    }
    if (line && line.indexOf('\n') !== -1) {
      var parts = line.split('\n')
      for (var i = 0; i < parts.length; i++) {
        add(parts[i])
      }
      return
    }
    addLine(line, cols, opts)
  }

  function formatLine(line) {
    if (strlenAnsi(line) < cols) {
      line = line + ' '.repeat(cols - line.length)
    }
    if (opts.color)  line = chalk[opts.color](line)
    if (opts.border) line = chalk.grey('| ') + line + chalk.grey(' |')
    return line
  }

  function addLine (line, cols, opts) {
    if (strlenAnsi(line) > cols) {
      addLine(sliceAnsi(line, 0, cols))
      addLine(sliceAnsi(line, cols))
      return
    }
    out.push(formatLine(line))
  }
}




// Length of 'str' sans ANSI codes
function strlenAnsi (str) {
  var len = 0
  var insideCode = false

  for (var i=0; i < str.length; i++) {
    var chr = str.charAt(i)
    if (chr === '\033') insideCode = true
    if (!insideCode) len++
    if (chr === 'm' && insideCode) insideCode = false
  }

  return len
}

// Like String#slice, but taking ANSI codes into account
function sliceAnsi (str, from, to) {
  var len = 0
  var insideCode = false
  var res = ''
  to = (to === undefined) ? str.length : to

  for (var i=0; i < str.length; i++) {
    var chr = str.charAt(i)
    if (chr === '\033') insideCode = true
    if (!insideCode) len++
    if (chr === 'm' && insideCode) insideCode = false

    if (len > from && len <= to) {
      res += chr
    }
  }

  return res
}

// Character-wrap text containing ANSI escape codes.
// String, Int -> [String]
function wrapAnsi (text, width) {
  if (!text) return []

  var res = []

  var line = []
  var lineLen = 0
  var insideCode = false
  for (var i=0; i < text.length; i++) {
    var chr = text.charAt(i)
    if (chr === '\033') {
      insideCode = true
    }

    line.push(chr)

    if (!insideCode) {
      lineLen++
      if (lineLen >= width - 1) {
        res.push(line.join(''))
        line = []
        lineLen = 0
      }
    }

    if (chr === 'm' && insideCode) {
      insideCode = false
    }
  }

  if (line.length > 0) {
    res.push(line.join(''))
  }

  return res
}

module.exports = {
  Box: Box
}