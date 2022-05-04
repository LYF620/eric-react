export function render(element, container) {
  const dom =
    element.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type)

  // 赋值jsx的属性
  const isProperty = (key) => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name]
    })

  // 递归调用，渲染出所有元素
  element.props.children &&
    element.props.children.forEach((child) => render(child, dom))

  container.appendChild(dom)
}
