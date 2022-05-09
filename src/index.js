import { Eric } from './EricReact'

// 实现函数式组件
// 1、函数式组件的fiber不存在dom node
// 2、相比于之前的实现，child来源于函数式组件的内容，而不是props
/** @jsx Eric.createElement */
function Counter() {
  const [state, setState] = Eric.useState(1)
  return <h1 onClick={() => setState((c) => c + 1)}>Count: {state}</h1>
}
const element = <Counter />
const container = document.getElementById('root')
Eric.render(element, container)
