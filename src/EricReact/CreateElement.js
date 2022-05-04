export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // children可能包含原始值，这里我们新建createTextElement处理原始值，新增elementType：TEXT_ELEMENT
      // 这里和原始react有区别，React 不会包装原始值或在没有 时创建空数组children
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  }
}

export function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
