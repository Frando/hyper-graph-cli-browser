var chalk = require('chalk')

module.exports = {
    formatLines,
    strlenAnsi,
    sliceAnsi
}

function formatLines(lines, opts) {
  opts = opts || {}
  var out = []
  opts.cols = opts.cols || process.stdout.columns
  opts.rows = opts.rows || process.stdout.rows

  var cols = opts.cols
  if (opts.border) cols = cols - 4
  var rows = opts.rows
  if (opts.border) rows = rows - 4

  for (var i = 0, len = lines.length; i < len; i++) {
    add(lines[i])
  }

  out = out.slice(-opts.rows)
  if (out.length < rows) {
    out = out.concat(Array(rows - out.length).fill(formatLine('', cols, opts)))
  }
  if (opts.border) {
    var bl = chalk.grey('+' + '-'.repeat(cols + 2) + '+')
    out.push(bl)
    out.unshift(bl)
  }

  return out

  function add(line) {
    if (typeof line === 'object') {
      try {
        line = JSON.stringify(line)
      }
      catch (e) {
        line = '[Object object]'
      }
    }
    line = String(line)
    if (line && line.indexOf('\n') !== -1) {
      var parts = line.split('\n')
      for (var i = 0; i < parts.length; i++) {
        add(parts[i])
      }
      return
    }
    if (strlenAnsi(line) > cols) {
      add(sliceAnsi(line, 0, cols - 2))
      add('  ' + sliceAnsi(line, cols - 2))
      return
    }
    line = formatLine(line, cols, opts)
    out.push(line)
  }

  function formatLine(line, cols, opts) {
    if (line.length < cols) line = line + ' '.repeat(cols - line.length)
    if (opts.color) line = chalk[opts.color](line)
    if (opts.border) {
      line = chalk.grey('| ') + line + chalk.grey(' |')
    }
    return line
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