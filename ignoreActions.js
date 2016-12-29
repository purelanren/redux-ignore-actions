// 使用该库，需要遵循以下原则：
// 1、必须以api和type为同一个action的唯一标识
// 2、等待、响应（成功或失败）的action的type必须不相同
// 3、每批次的action必须有这个批次的唯一标识Symbol[IGNORE_ID]，并且该批次的等待、响应（成功或失败）的action必须拥有相同的Symbol[IGNORE_ID]属性值
// 4、需要做竞态处理的action，等待、响应（成功或失败）的action必须拥有Symbol[IGNORE_RACE]为true的属性值
// 5、如果需要忽略对CALL_API action的处理，则需要声明Symbol[NOT_IGNORE]为true的属性值

import { LOCATION_CHANGE } from 'react-router-redux'
import UUID from 'uuid-js'

export const IGNORE_ID = Symbol('ignore id')
export const IGNORE_RACE = Symbol('ignore race')
export const NOT_IGNORE = Symbol('not ignore')
export const IGNORE_ACTION_TYPE = '@@ignoreActions/IGNORE_ACTION_TYPE'

// 删除定制属性
const reduceAction = function reduceAction (action) {
  delete action[IGNORE_ID]
  delete action[IGNORE_RACE]
  delete action[NOT_IGNORE]
  return action
}

export const createIgnoreId = () => UUID.create().toString()

let ignoreActionsCache = {}
let lastRaceActions = {}
let prevPathname

// 当路由改变时忽略处理中的action
const createIgnoreAction = (originAction) => ({
  type: IGNORE_ACTION_TYPE,
  originAction
})
export const ignoreInvalidAction = ({ dispatch }) => next => action => {
  const { type, api, payload } = action
  const ignoreId = action[IGNORE_ID]
  const ignoreRace = action[IGNORE_RACE]
  const notIgnore = action[NOT_IGNORE]

  // APP初始化
  if (!prevPathname) {
    prevPathname = payload && payload.pathname
    return next(action)
  }

  // 当路由改变时，ignore所有waiting中的action
  if (type === LOCATION_CHANGE && prevPathname !== payload.pathname) {
    prevPathname = payload.pathname
    Object.getOwnPropertyNames(ignoreActionsCache).forEach(id => {
      if (ignoreActionsCache[id].status === 'waiting') {
        ignoreActionsCache[id].status = 'ignore'
        dispatch(createIgnoreAction(ignoreActionsCache[id].originAction))
      }
    })
    return next(action)
  }

  // 排除声明not ignore、没有ignoreId标识的action
  if (notIgnore || !ignoreId) {
    return next(action)
  }

  // ignore action
  if (ignoreActionsCache[ignoreId] && ignoreActionsCache[ignoreId].status === 'ignore') {
    delete ignoreActionsCache[ignoreId]
    return
  }

  // 初次进入的action标记为waiting，否则视为返回值并删除cache内的记录
  if (typeof ignoreActionsCache[ignoreId] === 'undefined') {
    ignoreActionsCache[ignoreId] = {
      status: 'waiting',
      originAction: Object.assign({}, action)
    }
  } else {
    delete ignoreActionsCache[ignoreId]
  }

  // 竞态action
  if (ignoreRace) {
    // CALL_API的action，以api作为竞态记录标识
    const actionType = api || type
    lastRaceActions[actionType] = lastRaceActions[actionType] || {}

    // 发现记录内存在相同标识的action等待响应，则忽略之前action的响应
    if (lastRaceActions[actionType].type === type) {
      const origin = ignoreActionsCache[lastRaceActions[actionType].ignoreId]
      if (origin) {
        origin.status = 'ignore'
        dispatch(createIgnoreAction(origin.originAction))
      }
    }

    // 记录内的action完成响应，清除该记录
    if (lastRaceActions[actionType].ignoreId === ignoreId) {
      delete lastRaceActions[actionType]
    }

    // 添加、更新等待响应的记录
    if (lastRaceActions[actionType]) {
      lastRaceActions[actionType] = { ignoreId, type }
    }
  }

  return next(reduceAction(action))
}
