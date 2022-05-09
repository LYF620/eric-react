import { Eric } from './EricReact'
// import ReactDOM from 'react-dom'
// import React from 'react'

// 如果我们有这样的注释，当 babel 编译 JSX 时，它将使用我们定义的函数
/** @jsx Eric.createElement */
const container = document.getElementById('root')

const updateValue = (e) => {
  rerender(e.target.value)
}

const rerender = (value) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  )
  Eric.render(element, container)
}

rerender('World')
