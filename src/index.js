import { Eric } from './EricReact'
import ReactDOM from 'react-dom'
import React from 'react'
// step 1 : 实现createElement

// 如果我们有这样的注释，当 babel 编译 JSX 时，它将使用我们定义的函数
/** @jsx Eric.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
)

const container = document.getElementById('root')
Eric.render(element, container)
