# GameEngine.js

- _engine 属性

_engine属性是在创建GameEngine之后会自动赋值的一个实例，类似于单例模式，这个属性为其他的内部组件服务，外部不可访问

### constructor(width, height)
初始化参数 `width` 是 canvas 的宽度`height` 是 canvas 的高度，在创建类之后会赋值 `_engine` 并且会直接修改 canvas 的大小。

