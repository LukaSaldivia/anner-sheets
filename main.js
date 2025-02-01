const $ = (selector = '') => document.querySelector(selector)
const _$ = (element = HTMLElement, selector = '') => element.querySelector(selector)
const $$ = (selector = '') => document.querySelectorAll(selector)
const _$$ = (element = HTMLElement, selector = '') => element.querySelectorAll(selector)

class Cell{
  constructor(row, col){
    this.row = row
    this.col = col
    this.value = ''
    this.computed = ''
    this.address = `${getLetter(col)}${row + 1}`
  }

  updateValue(value){
    if (value === this.value)
    return

    this.value = value

    if (this.value.startsWith('=')){
      let fn = this.value.slice(1)

      let constants = getCellsAsConstants(STATE)
      console.log(constants)

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

  }

  getComputed(){
    let res = this.computed
    try {
      let cast = Number(this.value)
      if (isNaN(cast)){
        throw new Error('Invalid number')
        
      }
      res = cast
    } catch (error) {
      res = `"${this.value}"`
    }

    return res
  }



  

}



const cell_group = $('.cell-group')
const column_count = $('.column-count')
const row_count = $('.row-count')

cell_group.addEventListener('dblclick', ({target}) => {

  const cell = target.closest('.cell')

  if (!cell) return

  const input = _$(cell, 'input')
  const computed = _$(cell, 'div')

  const { row, col } = cell.dataset
  

  const end = input.value.length
  input.setSelectionRange(end, end)
  input.focus()

  input.addEventListener('blur', () => {
    let cell = STATE[row][col]

    cell.updateValue(input.value)

    STATE[row][col] = cell


    computed.textContent = cell.computed
  }, { once: true})

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape'){
      e.preventDefault()
      input.blur()
    }
  }
)
})
  
  




const ROWS = 20
const COLS = 5

const range = (length, cb) => Array.from({ length }, (_, i) => i).map(cb)

let STATE = range(ROWS, (row) => range(COLS, (col) => new Cell(row, col)))


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