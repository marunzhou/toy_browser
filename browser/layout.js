function getStyle(element) {
    if (!element.style) element.style = {}

    for (let prop in element.computedStyle) {
        let value = element.computedStyle[prop].value
        element.style[prop] = element.computedStyle[prop].value
        
        if (value.toString().match(/px$/) || value.toString().match(/[0-9.]+$/)) {
            element.style[prop] = parseInt(value)
        }
    }

    return element.style
}

function layout (element) {
    if (!element.computedStyle) return

    let elementStyle = getStyle(element)

    if (elementStyle.display !== 'flex') return

    var items = element.children.filter(e => e.type === 'element')

    items.sort(function (a, b) {
        return (a.order || 0) - (b.order || 0)
    })

    let style = elementStyle;

    ['width', 'height'].forEach(size => {
        if (style[size] === 'auto' || style[size] === '') {
            style[size] = null
        }
    })

    if (!style.flexDirction || style.flexDirction === 'auto') {
        style.flexDirction = 'row'
    }
    if (!style.alignItems || style.alignItems === 'auto') {
        style.alignItems = 'stretch'
    }
    if (!style.justifyContent || style.justifyContent === 'auto') {
        style.justifyContent = 'flex-start'
    }
    if (!style.flexWrap || style.flexWrap === 'auto') {
        style.flexWrap = 'nowrap'
    }
    if (!style.alignContent || style.alignContent === 'auto') {
        style.alignContent = 'stretch'
    }

    var mainSize, mainStart, mainEnd, mainSign, mainBase,
        crossSize, crossStart, crossEnd, crossSign, crossBase
    
    // flexDircition
    if (style.flexDirction === 'row') {
        mainSize = 'width'
        mainStart = 'left'
        mainEnd = 'right'
        mainSign = +1
        mainBase = 0

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }
    if (style.flexDirction === 'row-reverse') {
        mainSize = 'width'
        mainStart = 'right'
        mainEnd = 'left'
        mainSign = -1
        mainBase = style[mainSize]

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }
    if (style.flexDirction === 'column') {
        mainSize = 'height'
        mainStart = 'top'
        mainEnd = 'bottom'
        mainSign = +1
        mainBase = 0

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }
    if (style.flexDirction === 'colunm-reverse') {
        mainSize = 'height'
        mainStart = 'bottom'
        mainEnd = 'top'
        mainSign = -1
        mainBase = style[mainSize]

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }

    // flexWrap https://developer.mozilla.org/en-US/docs/Web/CSS/flex-wrap
    if (style.flexWrap === 'wrap-reverse') { // 换行且反转
        let tmp = crossStart
        crossStart = crossEnd
        crossEnd = tmp
        crossSign = -1
    } else {
        crossBase = 0
        crossSign = +1
    }

    // isAutoMainSize
    var isAutoMainSize = false
    if (!style[mainSize]) {
        elementStyle[mainSize] = 0

        for (let i = 0; i < items.length; i++) {
            // let item = items[i]
            let itemStyle = getStyle(item[i])
            if (itemStyle[mainSize] !== null || itemStyle[mainSize] != (void 0)) {
                elementStyle[mainSize] += itemStyle[mainSize]
            }
        }

        isAutoMainSize = true
    }

    let flexLine = []
    let flexLines = [flexLine]

    let mainSpace = elementStyle[mainSize]
    let crossSpace = 0

    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        let itemStyle = getStyle(item)

        if (itemStyle[mainSize] === null) {
            itemStyle[mainSize] = 0
        }
        if (itemStyle.flex) {
            // 属于flex 可以不考虑换行
            flexLine.push(item)
        } else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
            mainSpace -= elementStyle[mainSize]
            if (elementStyle[crossSize] !== null || elementStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, elementStyle[crossSize])
            }
            flexLine.push(item)
        } else {
            if (itemStyle[mainSize] > style[mainSize]) {
                itemStyle[mainSize = style[mainSize]]
            }

            if (mainSpace < itemStyle[mainSize]) {
                // 下面两句没有意义 ？？
                // flexLine.mainSpace = mainSpace
                // flexLine.crossSpace = crossSpace
                flexLine = [item]
                flexLines.push(item)
                // 新的一行开始，初始盒子大小
                mainSpace = itemStyle[mainSize]
                crossSpace = 0
            } else {
                flexLine.push(item)
            }
            if (elementStyle[crossSize] !== null || elementStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, elementStyle[crossSize])
            }
            mainSpace -= elementStyle[mainSize]
        }
    }

    flexLine.mainSpace = mainSpace
    // 这里为什么用|| ？？
    if (style.flexWrap === 'nowrap' || isAutoMainSize) {
        flexLine.crossSpace = (style[crossSize] !== (void 0)) ? style[crossSize] : crossSpace
    } else {
        flexLine.crossSpace = crossSpace
    }

    if (mainSpace < 0) {
        let scale = style[mainSize] / (style[mainSize] - mainSpace)
        let currentMain = mainBase

        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            let itemStyle = getStyle(item)

            if (itemStyle.flex) {
                // 为什么要设置为 0 ？？
                itemStyle[mainSize] = 0
            }

            itemStyle[mainSize] = itemStyle[mainSize] * scale
            itemStyle[mainStart] = currentMain
            itemStyle[mainEnd] = itemStyle[mainStart] + itemStyle[mainStart] * mainSign
            currentMain = itemStyle[mainEnd]
        }
    } else {
        flexLines.forEach((items) => {
            let mainSpace = items.mainSpace
            let flexTotal = 0

            // 计算 flexTotal
            for (let i = 0; i < items.length; i++) {
                let itemStyle = getStyle(items[i])

                if (itemStyle.flex !== null && (itemStyle.flex !== (void 0))) {
                    flexTotal += itemStyle.flex
                    continue
                }
            }

            if (flexTotal > 0) {
                let currentMain = mainBase
                for (let i = 0; i < items.length; i++) {
                    let itemStyle = getStyle(items[i])
                    if (itemStyle.flex) {
                        itemStyle[mainSize] = mainSpace / flexTotal * itemStyle.flex
                    }

                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] * mainSign
                    currentMain = itemStyle[mainEnd]
                }
            } else {
                if (style.justifyContent === 'flex-start') {
                    let currentMain = mainBase
                    let step = 0
                } else if (style.justifyContent === 'flex-end') {
                    let currentMain = mainSpace * mainSign + mainBase
                    let step = 0
                } else if (style.justifyContent === 'center') {
                    let currentMain = mainSpace / 2 * mainSign + mainBase
                    let step = 0
                } else if (style.justifyContent === 'space-between') { // 空白区域全等宽
                    let currentMain = mainBase
                    let step = mainSpace / (items.length - 1) * mainSign
                } else if (style.justifyContent === 'space-around') {
                    let step = mainSpace / items.length * mainSign
                    let currentMain = step / 2 + mainBase
                }

                for (let i = 0; i < items.length; i++) {
                    let itemStyle = getStyle(items[i])
    
                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainBase * mainSign
                    currentMain = step + itemStyle[mainEnd]
                }
            }
        })
    }

    // 计算 交叉轴
    // align-items, align-self

    if (!style[crossSize]) {
        crossSpace = 0
        elementStyle[crossSize] = 0

        for (let i = 0; i < flexLines.length; i++) {
            elementStyle[crossSize] += flexLines[i].crossSpace
        }
    } else {
        crossSpace = style[crossSize]
        for (let i = 0; i < flexLines.length; i++) {
            crossSpace -= flexLines[i].crossSpace
        }
    }

    if (style.flexWrap === 'wrap-reverse') {
        crossBase = style[crossSize]
    } else {
        crossBase = 0
    }

    let lineSize = style[crossSize] / flexLines.length
    let step
    // flex-start：与交叉轴的起点对齐。
    // flex-end：与交叉轴的终点对齐。
    // center：与交叉轴的中点对齐。
    // space-between：与交叉轴两端对齐，轴线之间的间隔平均分布。
    // space-around：每根轴线两侧的间隔都相等。所以，轴线之间的间隔比轴线与边框的间隔大一倍。
    // stretch（默认值）：轴线占满整个交叉轴。
    if (style.alignContent === 'flex-start') {
        crossBase += 0
        step = 0
    } else if (style.alignContent === 'flex-end') {
        crossBase += crossSign * crossSpace
        step = 0
    } else if (style.alignContent === 'center') {
        crossBase += crossSign * crossSpace / 2
        step = 0
    } else if (style.alignContent === 'space-between') {
        crossBase += crossSign * crossSpace / (flexLines.length - 1)
        step = 0
    } else if (style.alignContent === 'space-around') {
        step = crossSpace / flexLines.length
        crossBase += crossSign * step / 2
    } else if (style.alignContent === 'stretch') { // 
        crossBase += 0
        step = 0
    }

    flexLines.forEach(items => {
        var lineCrossSize = style.alignContent === 'stretch' ? items.crossSpace + crossSpace / flexLines.length : items.crossSpace

        for (let i = 0; i < items.length; i++) {
            let itemStyle = getStyle(items[i])
            let align = itemStyle.alignSelf || itemStyle.alignItems

            if (itemStyle[crossSize] === null) {
                itemStyle[crossSize] = (align === 'stretch') ? lineCrossSize : 0
            }

            if (align === 'flex-start') {
                itemStyle[crossStart] = crossBase
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
            } else if (align === 'flex-end') {
                itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
                itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
            } else if (align === 'center') {
                itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
            } else if (align === 'stretch') {
                itemStyle[crossStart] = crossBase
                itemStyle[crossEnd] = crossBase + crossSign * (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) ? itemStyle[crossSize] : lineCrossSize
                itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart])
            }
        }
        crossBase += crossSign * (lineCrossSize + step)
    })

    console.log(element)
}
module.exports = layout