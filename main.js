// ----- Excel Related functions and variables -----

function MAX(...args) {
  return Math.max(...args)
}

function MIN(...args) {
  return Math.min(...args)
}

function AVG(...args) {
  return args.reduce((acc, curr) => acc + curr, 0) / args.length
}

function CLAMP(min, value, max) {
  return Math.min(Math.max(value, min), max)
}

function SUM(...args) {
  return args.reduce((acc, curr) => Number(acc) + Number(curr), 0)
}

function ABS(value) {
  return Math.abs(value)
}

function ROUND(value, decimals = 0) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals
}

function COUNT(...args) {
  return args.length
}

function COUNTA(...args) {
  return args.filter(arg => arg.trim() !== '').length
}

function IF(condition, ifTrue = 'true', ifFalse = 'false') {
  return condition ? ifTrue : ifFalse
}

function AND(...args) {
  return args.every(arg => arg)
}

function OR(...args) {
  return args.some(arg => arg)
}

function NOT(value) {
  return !value
}

function LEN(value) {
  return value.length
}

function LEFT(value, length = 1) {
  return value.slice(0, length)
}

function RIGHT(value, length = 1) {
  return value.slice(-length)
}

function MID(value, start = 0, length = 1) {
  return value.slice(start, start + length)
}

function UPPER(value) {
  return value.toUpperCase()
}

function LOWER(value) {
  return value.toLowerCase()
}

function CONCAT(...args) {
  return args.join('')
}

function NOW() {
  return new Date().toLocaleTimeString()
}

function TODAY() {
  return new Date().toLocaleDateString()
}


const PI = Math.PI

const ERRORS = {
  REF: {
    code: '#REF',
    message: 'Auto reference error'
  },
  SYNTAX: {
    code: '#SYNTAX',
    message: 'There is an error in the function´s syntax'
  },
  NULLFUNCTION: {
    code: '#NULLFUNCTION',
    message: 'Cell with initialized function, but argument is empty'
  },
  NAN: {
    code: '#NAN',
    message: 'Some value is not a valid number'
  }
}





// -------------------------------------------


const $ = (selector = '') => document.querySelector(selector)
const _$ = (element = HTMLElement, selector = '') => element.querySelector(selector)
const $$ = (selector = '') => document.querySelectorAll(selector)
const _$$ = (element = HTMLElement, selector = '') => element.querySelectorAll(selector)

const range = (length, cb) => Array.from({ length }, (_, i) => i).map(cb)


class Cell {
  constructor(row, col, render) {
    this.row = row
    this.col = col
    this.value = ''
    this.computed = ''
    this.address = `${getLetter(col)}${row + 1}`
    this.render = render

    this.suscribers = {}
  }

  updateValue(value, force = false, parentAddress = '') {


    if (!force && value === this.value) return
    this.render.classList.remove('error')
    this.render.setAttribute('title', '')

    this.value = value

    if (this.value.startsWith('=')) {
      let fn = this.value.slice(1)

      let [nullFnError, a = value] = handleError(() => {
        if (fn.trim() === '') {
          throw new Error(ERRORS.NULLFUNCTION.code)
        }
      }, ERRORS.NULLFUNCTION.code)

      if (nullFnError) {
        this.computed = nullFnError.message
        this.renderValue(this.computed, true)
        return

      }

      let [refError, b = value] = handleError(() => {
        if (fn.includes(this.address)) {
          throw new Error(ERRORS.REF.code)
        }
      }, ERRORS.REF.code)

      if (refError) {
        this.computed = refError.message
        this.renderValue(this.computed, true)
        return
      }

      let ranges = splitRanges(fn)

      ranges.forEach(range => {
        let rangeCells = getRange(range)
        fn = fn.replace(range, rangeCells)
      })

      let cellsInvolved = splitConstants(fn)
      cellsInvolved = [...new Set(cellsInvolved)]

      if (cellsInvolved.length > 0) {
        this.suscribe(cellsInvolved)
      }

      if (force && !cellsInvolved.includes(parentAddress)) {
        delete STATE[parentAddress].suscribers[this.address]
      }

      let constants = getCellsAsConstants(cellsInvolved)





      let [syntaxError, c = value] = handleError(() => {
        let fn_wrapper = new Function('', `
          ${constants}
          return ${fn}`)

        return fn_wrapper()
      }, ERRORS.SYNTAX.code)

      if (syntaxError) {
        this.computed = syntaxError.message
        this.renderValue(this.computed, true)
        return
      } else {

        if (typeof c == "number" && Number.isNaN(c)) {
          let nanError = new Error(ERRORS.NAN.code)
          this.computed = nanError.message
          this.renderValue(this.computed, true)
          return
        }
        this.computed = c
        this.renderValue(this.computed)
      }

    } else {
      this.computed = this.value
      this.renderValue(this.computed)
    }


    for (const suscriberAddress in this.suscribers) {
      const suscriber = this.suscribers[suscriberAddress]
      suscriber.updateValue(suscriber.value, true, this.address)
    }

  }

  getComputed() {
    let res = this.computed
    try {
      let cast = Number(res)
      if (isNaN(cast)) {
        throw new Error('Invalid number')
      }
      res = cast
    } catch (error) {
      res = `"${this.computed}"`
    }

    return res
  }

  suscribe(addresses = [String]) {

    addresses.forEach(address => {
      if (address !== this.address) {
        STATE[address].suscribers[this.address] = this
      }
    })

  }

  renderValue(value = '', error = false) {
    if (error) {
      this.render.classList.add('error')
      this.render.setAttribute('title', ERRORS[value.substring(1)].message)
    }
    this.render.textContent = value
  }

}



const cell_group = $('.cell-group')
const column_count = $('.column-count')
const row_count = $('.row-count')
const selected_cell_input = $('.selected-cell')
const cell_value_input = $('.cell-value')
const contextmenu = $('.contextmenu')
let cell_value_input_aux = ''

const ROWS = 100
const COLS = 26

let last_focused_cell = null

cell_group.setAttribute('style', `--columns : ${COLS}; --rows : ${ROWS}`)

const MOUSE = {
  firstCell: null,
  lastCell: null,
  isHolding: false
}


// Event-Listeners


// cell_group
{
cell_group.addEventListener('dblclick', ({ target }) => {

  const cell = target.closest('.cell')

  if (!cell) return

  useCell(cell)

})

cell_group.addEventListener('click', ({ target }) => {


  $$('.cell div.focus').forEach(div => div.classList.remove('focus'))

  const cell = target.closest('.cell')

  if (!cell) return

  unhighlightSelectedCells()


  const computed = _$(cell, 'div')

  if (![...getErrorsCode(), ''].includes(computed.textContent.trim())) {
    computed.classList.add('focus')
    return
  }

  return useCell(cell)

}
)

cell_group.addEventListener('mousedown', ({ target }) => {
  const cell = target.closest('.cell')

  if (!cell) return


  MOUSE.isHolding = true
  MOUSE.firstCell = cell
  MOUSE.lastCell = null

})

cell_group.addEventListener('mousemove', ({ target }) => {
  const cell = target.closest('.cell')

  if (!cell || !MOUSE.isHolding) return


  MOUSE.lastCell = cell


  const { address: firstAddress } = MOUSE.firstCell.dataset
  const { address: lastAddress } = MOUSE.lastCell.dataset


  const range = {}
  range.value = lastAddress != firstAddress ? `=${firstAddress}:${lastAddress}` : `=${firstAddress}`

  selected_cell_input.value = lastAddress != firstAddress ? `${firstAddress}:${lastAddress}` : `${firstAddress}`

  highlightSelectedCells(range)





})

cell_group.addEventListener('contextmenu', (e) => {
  e.preventDefault()

  const { clientX: x, clientY : y } = e
  contextmenu.setAttribute('style', `--_x: ${x}px; --_y: ${y}px`)
})
}

// column_count
{
column_count.addEventListener('click', ({ target }) => {

  $$('.row.selected').forEach(selected => selected.classList.remove('selected'))
  $$('.column.selected').forEach(selected => selected.classList.remove('selected'))

  const { col } = target.dataset
  target.classList.add('selected')

  const letter = getLetter(Number(col))

  let range = {}

  range.value = `=${letter}1:${letter}${ROWS}`

  highlightSelectedCells(range)
})
}

// row_count
{
row_count.addEventListener('click', ({ target }) => {

  $$('.row.selected').forEach(selected => selected.classList.remove('selected'))
  $$('.column.selected').forEach(selected => selected.classList.remove('selected'))


  const { row } = target.dataset
  target.classList.add('selected')

  let range = {}

  range.value = `=${getLetter(0)}${+row + 1}:${getLetter(COLS - 1)}${+row + 1}`

  highlightSelectedCells(range)
})
}

// document
{
document.addEventListener('mouseup', () => {
  MOUSE.isHolding = false
  MOUSE.firstCell = null
  MOUSE.lastCell = null
})

document.addEventListener('keydown', (e) => {

  const activeCell = $('.cell:has(input:focus)')

  if (!activeCell) return

  const { row, col } = activeCell.dataset

  let nextCell = null

  if (e.ctrlKey) {
    if (e.key === 'ArrowUp') {
      nextCell = $(`.cell[data-row="${Math.max(Number(row) - 1, 0)}"][data-col="${col}"]`)
    }
    if (e.key === 'ArrowDown') {
      nextCell = $(`.cell[data-row="${Math.min(Number(row) + 1, ROWS - 1)}"][data-col="${col}"]`)

    }
    if (e.key === 'ArrowLeft') {
      nextCell = $(`.cell[data-row="${row}"][data-col="${Math.max(col - 1, 0)}"]`)

    }
    if (e.key === 'ArrowRight') {
      nextCell = $(`.cell[data-row="${row}"][data-col="${Math.min(Number(col) + 1, COLS - 1)}"]`)
    }

    if (nextCell) {
      useCell(nextCell)
    }
  }

})

document.addEventListener('focusin', ({ target }) => {

  if (target.tagName === 'INPUT') {
    const cell = target.closest('.cell')
    if (!cell) return

    useCell(cell)
  }
})

document.addEventListener('click', () => {  
  syncValue(cell_value_input, '')
  contextmenu.setAttribute('style', `--_x: -100%; --_y: -100%`)
})
}

// p[contenteditable]
{
$("p[contenteditable]").addEventListener('keydown', ({ key }) => {
  if (key == "Enter") {
    $("p[contenteditable]").blur()
  }
})
}

// cell_value_input
{
cell_value_input.addEventListener('focus', () => {
  _$(last_focused_cell, 'input').classList.add('focus-force')
  cell_value_input_aux = cell_value_input.value
  highlightSelectedCells(cell_value_input)
})

cell_value_input.addEventListener('input', () => {
  let input = _$(last_focused_cell, 'input')
  syncValue(input,cell_value_input.value)
  cell_value_input_aux = cell_value_input.value
  last_focused_cell.classList.toggle('writing-function', input.value.startsWith('='))

  highlightSelectedCells(cell_value_input)
})

cell_value_input.addEventListener('blur', () => {
  let input = _$(last_focused_cell, 'input')
  input.classList.remove('focus-force')
  syncValue(cell_value_input, '')

  const { address } = last_focused_cell.dataset

  let cellRef = STATE[address]
  
  cellRef.updateValue(cell_value_input_aux)

  unhighlightSelectedCells()


})

cell_value_input.addEventListener('keydown', ({ key }) => {
  if (key == "Enter") {
    cell_value_input.blur()
  }
})
}

// selected_cell_input
{
  selected_cell_input.addEventListener('input', () => {
    let { value } = selected_cell_input

    let user = {}

    user.value = `=${value}`

    highlightSelectedCells(user)
  })
}


// Sheet creation

range(ROWS, (row) => {
  range(COLS, (col) => {
    const cell = document.createElement('div')
    cell.classList.add('cell')
    cell.classList.add('stack')
    cell.setAttribute('data-row', row)
    cell.setAttribute('data-col', col)
    cell.setAttribute('data-address', `${getLetter(col)}${row + 1}`)

    cell.appendChild(document.createElement('div'))
    cell.appendChild(document.createElement('input'))


    cell_group.appendChild(cell)
  })
})

last_focused_cell = $('.cell[data-address="A1"]')

// Cells creation

let STATE = {}

for (let i = 0; i < ROWS * COLS; i++) {

  let row = Math.floor(i / COLS)
  let col = i % COLS

  STATE[`${getLetter(col)}${row + 1}`] = new Cell(row, col, $(`.cell[data-row="${row}"][data-col="${col}"] div`))

}

// Column-count creation

range(COLS, (col) => {
  const column = document.createElement('div')
  column.classList.add('column')
  column.setAttribute('data-col', col)
  column.textContent = getLetter(col)
  column_count.appendChild(column)
})

// Row-count creation

range(ROWS, (row) => {
  const row_element = document.createElement('div')
  row_element.classList.add('row')
  row_element.setAttribute('data-row', row)
  row_element.textContent = row + 1
  row_count.appendChild(row_element)
})



// Functions

function getLetter(num = 0) {
  return String.fromCharCode(65 + num)
}

function getNumber(letter = 'A') {
  return letter.charCodeAt(0) - 65
}

function getCellsAsConstants(cells = []) {
  return cells.map(cell => `const ${cell} = ${STATE[cell].getComputed()};`).join('')
}

function getRange(range = '') {
  const [start, end] = range.split(':')

  const [startCol, startRow] = start.match(/[A-Z]+|[0-9]+/g)
  const [endCol, endRow] = end.match(/[A-Z]+|[0-9]+/g)

  const startColIndex = getNumber(startCol)
  const endColIndex = getNumber(endCol)

  const minCol = Math.min(startColIndex, endColIndex)
  const maxCol = startColIndex + endColIndex - minCol


  const startRowIndex = Number(startRow) - 1
  const endRowIndex = Number(endRow) - 1

  const minRow = Math.min(startRowIndex, endRowIndex)
  const maxRow = startRowIndex + endRowIndex - minRow

  const area = (maxCol - minCol + 1) * (maxRow - minRow + 1)



  const rangeCells = {}

  for (let i = 0; i < area; i++) {
    let row = Math.floor(i / (maxCol - minCol + 1)) + minRow
    let col = i % (maxCol - minCol + 1) + minCol

    rangeCells[`${getLetter(col)}${row + 1}`] = 1
  }


  return Object.keys(rangeCells).join(',')
}

function getErrorsCode() {
  return Object.values(ERRORS).reduce((acc, error) => [...acc, error.code], [])
}



function splitConstants(operation = '') {
  return operation.split(/[^A-Z0-9]/g).filter(match => {
    return match.match(/[A-Z][0-9]+/g)
  })
}

function splitRanges(operation = '') {
  return operation.split(/[^A-Z0-9:]/g).filter(match => {
    return match.match(/[A-Z][0-9]+:[A-Z][0-9]+/g)
  })
}




function useCell(cell) {
  const input = _$(cell, 'input')

  $$('.row.selected').forEach(selected => selected.classList.remove('selected'))
  $$('.column.selected').forEach(selected => selected.classList.remove('selected'))


  const { col, row, address } = cell.dataset


  const end = input.value.length
  input.setSelectionRange(end, end)
  input.focus()

  const column_selected = $(`.column[data-col="${col}"]`)
  const row_selected = $(`.row[data-row="${row}"]`)

  column_selected.classList.add('selected')
  row_selected.classList.add('selected')

  syncValue(selected_cell_input, address)
  syncValue(cell_value_input, input.value)

  input.addEventListener('blur', () => {
    $$('.cell div.focus').forEach(div => div.classList.remove('focus'))
    let cellRef = STATE[address]
    unhighlightSelectedCells()


    column_selected.classList.remove('selected')
    row_selected.classList.remove('selected')

    syncValue(selected_cell_input, '')

    last_focused_cell = cell


    cellRef.updateValue(input.value)

  }, { once: true })

  input.addEventListener('input', () => {
    cell.classList.toggle('writing-function', input.value.startsWith('='))

    syncValue(cell_value_input, input.value)

    highlightSelectedCells(input)


  })

  input.addEventListener('focus', () => {
    highlightSelectedCells(input)
  }, { once : true })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      let belowCell = $(`.cell[data-row="${Number(row) + 1}"][data-col="${col}"]`)
      if (!belowCell)
        return input.blur()

      return useCell(belowCell)
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      return input.blur()
    }

  }
  )
}

function highlightSelectedCells({ value }) {
  unhighlightSelectedCells()

  if (value.startsWith('=')) {


    let cellsImplied = []

    let ranges = splitRanges(value)

    ranges.forEach(range => {
      let rangeCells = getRange(range)
      value = value.replace(range, rangeCells)
    })

    cellsImplied = splitConstants(value)

    cellsImplied.map(address => {
      STATE[address].render.classList.add('selected')
    })
  }

}

function unhighlightSelectedCells(){
  $$('.cell:has(div.selected) .selected').forEach(selected => selected.classList.remove('selected'))
}

function syncValue(destination, data){
  destination.value = data
}


function handleError(cb, errCode = '') {
  try {
    return [null, cb()]
  } catch (e) {
    return [new Error(errCode), null]
  }
}
