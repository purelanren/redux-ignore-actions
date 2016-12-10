# redux-ignore-actions
> [redux|react-redux-router]
---
**用于忽略其他路由的异步action返回值，需要处理竞态问题的action**

**使用本方法。默认已遵守如下约定：**

    · 必须以api和type为同一个action的唯一标识

    · 等待、响应（成功或失败）的action的type必须不相同

    · 每批次的action必须有这个批次的唯一标识Symbol[IGNORE_ID]，并且该批次的等待、响应（成功或失败）的action必须拥有相同的Symbol[IGNORE_ID]属性值

    · 需要做竞态处理的action，等待、响应（成功或失败）的action必须拥有Symbol[IGNORE_RACE]为true的属性值

    · 如果需要忽略对CALL_API action的处理，则需要声明Symbol[NOT_IGNORE]为true的属性值
