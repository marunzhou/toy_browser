const images = require('images')

function render(viewport, element) {
    if (element.style) {
        var img = images(Number(element.style.width) || 0, Number(element.style.height) || 0)
        if (element.style['background-color']) {
            console.log("width:", element.style.width, 'height:',element.style.height)
            let color = element.style['background-color'] || "rgb(0,0,0)"
            color.match(/rgb\((\d+),(\d+),(\d+)\)/)
            console.log("color:", RegExp.$1, RegExp.$2, RegExp.$3)
            img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3), 1)
            // img.fill(255,0,0, 1)
            console.log("left:", element.style.left || 0, element.style.top || 0)
            viewport.draw(img, element.style.left || 0, element.style.top || 0)
        }
    }

    if (element.children) {
        for (var child of element.children) {
            render(viewport, child)
        }
    }
}

module.exports = render