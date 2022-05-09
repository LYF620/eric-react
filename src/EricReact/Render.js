// 初始渲染时，我们会将rootFiber绑定给nextUnitOfWork
let nextUnitOfWork = null
// 创建wipRoot，用于记录我们正在工作的fiber树的根节点
let wipRoot = null
// 用啦记录上一次我们用来渲染的fiber树
let currentRoot = null
// 记录需要删除的node节点
let deletions = null

// 实现react的commit阶段，用于将计算完成的fiber树，实际添加到node中

function commitRoot() {
  // 当我们commit时，同样需要处理需要删除的node
  deletions.forEach(commitWork)

  // 在这里我们递归所有的节点，并将其添加到dom中
  commitWork(wipRoot.child)

  // 记录本次渲染使用的fiber🌲
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  // 函数式组件，不存在domnode，因此去掉下面这句话
  // const domParent = fiber.parent.dom
  // 更新为：
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // 替换原有值
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  }
  // 删除fiber
  else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom)
  }
  // 更新值
  else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  // 非函数式节点
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  }
  // 函数式节点,找到其上级，再删除
  else {
    commitDeletion(fiber.child, domParent)
  }
}
// 更新DOM使用的util函数
// 这里我们处理更新的一种特殊类型的道具是事件监听器，所以如果道具名称以“on”前缀开始，我们将以不同的方式处理它们。
const isEvent = (key) => key.startsWith('on')
// 是否存在children或事件属性
const isProperty = (key) => key !== 'children' && !isEvent(key)
// 属性值是否为新增的属性
const isNew = (prev, next) => (key) => prev[key] !== next[key]
// 是否为丢失属性
const isGone = (prev, next) => (key) => !(key in next)
// 更新DOM
function updateDom(dom, prevProps, nextProps) {
  // 删除旧的或更改了的事件监听器
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      // 获取事件名称
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  // 删除旧属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => (dom[name] = ''))

  // set or change properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => (dom[name] = nextProps[name]))
}

function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)
  return dom
}

// work循环 deadline该参数来源于requestIdleCallback
// 我们可以使用它来检查我们有多少时间，直到浏览器需要再次控制。
function workLoop(deadline) {
  // shouldYield 判断是否需要中断遍历
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    // 这里递归遍历fiber树
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
  // 这里使用调度（react最早基于requestIdleCallback实现，后来自己实现了schedule包）
  // https://github.com/facebook/react/issues/11171#issuecomment-417349573
  // 使用requestIdleCallback，浏览器会在主线程空闲时运行其回调
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

// 执行当前工作单元，并返回下一个工作单元
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  // 3、返回下一个工作单元
  // 优先遍历子树，子树不存在的话遍历兄弟树

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    // 遍历到最后的子树后，会一直返回到根节点（具体参考《React技术揭秘-理念篇-第一章-fiber架构实现原理-fiber结构一文》）
    nextFiber = nextFiber.parent
  }
}

function updateHostComponent(fiber) {
  // 1、添加dom节点
  // fiber 的dom属性记录dom的信息
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  // 2、对child遍历创建新的fiber,即开始构建fiber树🌲
  // 协调，diff比对
  reconcileChildren(fiber, fiber.props.children)
}

let wipFiber = null
let hookIndex = null
export function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]

  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  actions.forEach((action) => {
    hook.state = action(hook.state)
  })

  const setState = (action) => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []

  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function reconcileChildren(wipFiber, elements) {
  let index = 0
  // 获取old fiber🌲
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null
    // 开始diff，diff规则：
    // 4、react也会使用key，用来检测元素位置排序是否变更

    const sameType = oldFiber && element && element.type === oldFiber.type
    // 1、如果新旧元素相同，保留它，更新props
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    // 2、如果类型不同，并有一个新的元素，我们将创建一个新的dom
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }
    // 3、如果类型不同，并且存在一个旧的fiber，我们需要删除旧的节点
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    // oilFiber跳到其兄弟节点
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    // 将创建的fiber作为parent or sibling添加到fiber🌲中，这将取决于他的第一个child
    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

export function render(element, container) {
  // 我们设置nextUnitWork为fiber树的根
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // 记录上一次用来渲染的fiber🌲
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
