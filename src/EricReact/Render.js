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
  // 在这里我们递归所有的节点，并将其添加到dom中
  commitWork(wipRoot.child)
  // 当我们commit时，同样需要处理需要删除的node
  deletions.forEach(commitWork)
  // 记录本次渲染使用的fiber🌲
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// 更新DOM使用的util函数
// 这里我们处理更新的一种特殊类型的道具是事件监听器，所以如果道具名称以“on”前缀开始，我们将以不同的方式处理它们。
const isEvent = (key) => key.startWith('on')
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
  Object.key(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => (dom[name] = nextProps[name]))
}

// work循环 deadline该参数来源于requestIdleCallback
// 我们可以使用它来检查我们有多少时间，直到浏览器需要再次控制。
function workLoop(deadline) {
  // shouldYield
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
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

// requestIdleCallback(workLoop)

// 执行当前工作单元，并返回下一个工作单元
function performUnitOfWork(fiber) {
  // 1、添加dom节点
  // fiber 的dom属性记录dom的信息
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // 在performUnitOfWork中添加dom的话，如果浏览器打断了我们js的执行，用户可能会看到不完整的UI，所以appendChild不能在这里运行
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom)
  // }
  // 2、对child遍历创建新的fiber,即开始构建fiber树🌲
  const elements = fiber.props.children
  // 协调，diff比对
  reconcileChildren(fiber, elements)
  // 3、返回下一个工作单元
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function reconcileChildren(wipFiber, elements) {
  let index = 0
  // 获取old fiber
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null
  while (index < ElementInternals.length || oldFiber != null) {
    const element = elments[index]
    let newFiber = null
    // 开始diff，diff规则：
    // 4、react也会使用key，用来检测元素位置排序是否变更

    const sameType = oilFiber && element && element.type == oilFiber.type
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
    if (oilFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }
    // const newFiber = {
    //   type,
    //   props,
    //   parent: fiber,
    //   dom: null,
    // }
    // 将创建的fiber作为parent or sibling添加到fiber🌲中，这将取决于他的第一个child
    if (index == 0) {
      fiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

function createDom(fiber) {
  const dom =
    fiber.type == 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  // 赋值jsx的属性
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name]
    })
  return dom
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
  nextUnitOfWork = wipRoot
  deletions = []
}
