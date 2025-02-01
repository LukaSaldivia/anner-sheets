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

  updateValue(value){


    this.value = value

    if (this.value.startsWith('=')){
      let fn = this.value.slice(1)



      let constants = getCellsAsConstants(STATE)

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

    STATE[this.row][this.col] = this


    this.suscribers.forEach(cell => {
      cell.updateValue(cell.value)
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

    let cells = STATE.flat().reduce((acc , cell) => {

      acc[cell.address] = cell
      return acc

    },{})

    addresses.forEach(address => {
      if (cells[address]){
        cells[address].suscribers.push(this)
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

  const input = _$(cell, 'input')

  const { row, col } = cell.dataset
  

  const end = input.value.length
  input.setSelectionRange(end, end)
  input.focus()

  input.addEventListener('blur', () => {
    let cell = STATE[row][col]

    cell.updateValue(input.value)

  }, { once: true})

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape'){
      e.preventDefault()
      input.blur()
    }
  }
)
})

document.addEventListener('keydown', (e) => {
  const activeCell = $('.cell:has(input:focus)')
  if (!activeCell) return

  const { row, col } = activeCell.dataset

  let nextCell = null
  let input = null

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
    const { row, col } = nextCell.dataset
    input = _$(nextCell, 'input')
    const end = input.value.length
    input.setSelectionRange(0, end)
    input.focus()

    input.addEventListener('blur', () => {
      let cell = STATE[row][col]
  
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
    cell.setAttribute('data-row', row)
    cell.setAttribute('data-col', col)

    cell.appendChild(document.createElement('div'))
    cell.appendChild(document.createElement('input'))

    
    cell_group.appendChild(cell)
  })
})

let STATE = range(ROWS, (row) => range(COLS, (col) => new Cell(row, col, $(`.cell[data-row="${row}"][data-col="${col}"] div`))))


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




function getCellsAsConstants(state){
  return state.map(row => row.map(cell => `const ${cell.address} = ${cell.getComputed() || 0};`).join('')).join('')
}

function splitConstants(operation = ''){
  return operation.split(/[^A-Z0-9]/gm).filter(match => {
    return match.match(/[A-Z][0-9]+/g)
  })
}



