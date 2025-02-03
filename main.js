// ----- Excel Related functions and variables -----

function MAX(...args){
  return Math.max(...args)
}

function MIN(...args){
  return Math.min(...args)
}

function AVG(...args){
  return args.reduce((acc, curr) => acc + curr, 0) / args.length
}

function CLAMP(min, value, max){
  return Math.min(Math.max(value, min), max)
}

function SUM(...args){
  return args.reduce((acc, curr) => acc + curr, 0)
}

function ABS(value){
  return Math.abs(value)
}

function ROUND(value, decimals = 0){
  return Math.round(value * 10 ** decimals) / 10 ** decimals
}

function COUNT(...args){
  return args.length
}

function COUNTA(...args){
  return args.filter(arg => arg !== '').length
}

function IF(condition, ifTrue, ifFalse){
  return condition ? ifTrue : ifFalse
}

const PI = Math.PI



// -------------------------------------------


const $ = (selector = '') => document.querySelector(selector)
const _$ = (element = HTMLElement, selector = '') => element.querySelector(selector)
const $$ = (selector = '') => document.querySelectorAll(selector)
const _$$ = (element = HTMLElement, selector = '') => element.querySelectorAll(selector)

class Cell{
  constructor(row, col, render){
    this.row = row
    this.col = col
    this.value = ''
    this.computed = ''
    this.address = `${getLetter(col)}${row + 1}`
    this.render = render

    this.suscribers = []
  }

  updateValue(value, force = false){


    if (!force && value === this.value) return

    this.value = value

    if (this.value.startsWith('=')){
      let fn = this.value.slice(1)



      let constants = getCellsAsConstants(STATE)

      let ranges = splitRanges(fn)

      ranges.forEach(range => {
        let rangeCells = getRange(range)
        fn = fn.replace(range, rangeCells)
      })


      let cellsInvolved = splitConstants(fn)

      if (cellsInvolved.length > 0) {
        this.suscribe(cellsInvolved)
      }
      try {
        let fn_wrapper = new Function('', `
          ${constants}
          return ${fn}`)
        this.computed = fn_wrapper()
      } catch (error) {
        this.computed = '#ERROR'
      }



      
    }else{
      this.computed = this.value
    }

    STATE[this.address] = this


    this.suscribers.forEach(cell => {
        cell.updateValue(cell.value, true)
    })

    this.render.textContent = this.computed

  }

  getComputed(){
    let res = this.computed
    try {
      let cast = Number(res)
      if (isNaN(cast)){
        throw new Error('Invalid number')
        
      }
      res = cast
    } catch (error) {
      res = `"${this.value}"`
    }

    return res
  }

  suscribe(addresses = [String]){


    addresses.forEach(address => {
      if (STATE[address] && address !== this.address && !STATE[address].suscribers.includes(this)){
        STATE[address].suscribers.push(this)
      }
    })
    

  }
  



  

}



const cell_group = $('.cell-group')
const column_count = $('.column-count')
const row_count = $('.row-count')

cell_group.addEventListener('dblclick', ({target}) => {

  const cell = target.closest('.cell')

  if (!cell) return

  useCell(cell)

  
})

cell_group.addEventListener('click', ({target}) => {
  const cell = target.closest('.cell')

  if (!cell)
     return

  const computed = _$(cell, 'div')

  if (!['#ERROR', ''].includes(computed.textContent.trim()))
    return

  useCell(cell)
    

    
  }
)

document.addEventListener('keydown', (e) => {
  const activeCell = $('.cell:has(input:focus)')
  if (!activeCell) return

  const { row, col } = activeCell.dataset

  let nextCell = null

  if (e.key === 'ArrowUp'){
    nextCell = $(`.cell[data-row="${Math.max(Number(row) - 1,0)}"][data-col="${col}"]`)
  }
  if (e.key === 'ArrowDown'){
    nextCell = $(`.cell[data-row="${Math.min(Number(row) + 1, ROWS - 1)}"][data-col="${col}"]`)

  }
  if (e.key === 'ArrowLeft'){
    nextCell = $(`.cell[data-row="${row}"][data-col="${Math.max(col - 1, 0)}"]`)

  }
  if (e.key === 'ArrowRight'){
    nextCell = $(`.cell[data-row="${row}"][data-col="${Math.min(Number(col) + 1, COLS - 1)}"]`)
  }

  if (nextCell) {
    useCell(nextCell)
  }
})


  
  




const ROWS = 100
const COLS = 26

const range = (length, cb) => Array.from({ length }, (_, i) => i).map(cb)



cell_group.setAttribute('style', `--columns : ${COLS}; --rows : ${ROWS}`)

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

let STATE = {}

for (let i = 0; i < ROWS*COLS; i++) {

  let row = Math.floor(i / COLS)
  let col = i % COLS

  STATE[`${getLetter(col)}${row + 1}`] = new Cell(row, col, $(`.cell[data-row="${row}"][data-col="${col}"] div`))
  
}



range(COLS, (col) => {
  const column = document.createElement('div')
  column.classList.add('column')
  column.textContent = getLetter(col)
  column_count.appendChild(column)
})

range(ROWS, (row) => {
  const row_element = document.createElement('div')
  row_element.classList.add('row')
  row_element.textContent = row + 1
  row_count.appendChild(row_element)
})

function getLetter(num = 0) {
  return String.fromCharCode(65 + num)
}

function getNumber(letter = 'A') {
  return letter.charCodeAt(0) - 65
}




function getCellsAsConstants(state){
  // return state.map(row => row.map(cell => `const ${cell.address} = ${cell.getComputed() || 0};`).join('')).join('')
  return Object.values(state).map(cell => `const ${cell.address} = ${cell.getComputed() || '""'};`).join('')
}

function splitConstants(operation = ''){
  return operation.split(/[^A-Z0-9]/gm).filter(match => {
    return match.match(/[A-Z][0-9]+/g)
  })
}

function getRange(range = ''){
  const [start, end] = range.split(':')

  const [startCol, startRow] = start.match(/[A-Z]+|[0-9]+/g)
  const [endCol, endRow] = end.match(/[A-Z]+|[0-9]+/g)

  const startColIndex = getNumber(startCol)
  const endColIndex = getNumber(endCol)


  const startRowIndex = Number(startRow) - 1
  const endRowIndex = Number(endRow) - 1

  const area = (endColIndex - startColIndex + 1) * (endRowIndex - startRowIndex + 1)



  const rangeCells = []

  for(let i = 0; i < area; i++){
    let row = Math.floor(i / (endColIndex - startColIndex + 1)) + startRowIndex
    let col = i % (endColIndex - startColIndex + 1) + startColIndex

    rangeCells.push(`${getLetter(col)}${row + 1}`)
  }


  return rangeCells.join(',')
}

function splitRanges(operation = ''){
  return operation.split(/[^A-Z0-9:]/gm).filter(match => {
    return match.match(/[A-Z][0-9]+:[A-Z][0-9]+/g)
  })
}

// function getRangeValues(range = {}){
//   return Object.values(range).map(cell => cell.getComputed())
// }

function useCell(cell){
  const input = _$(cell, 'input')

  const { address } = cell.dataset
  

  const end = input.value.length
  input.setSelectionRange(end, end)
  input.focus()

  input.addEventListener('blur', () => {
    let cell = STATE[address]

    cell.updateValue(input.value)

  }, { once: true})

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape'){
      e.preventDefault()
      input.blur()
    }
  }
)
}



