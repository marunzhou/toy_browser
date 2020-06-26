const images = require('images')

function render(viewport, element) {
    if (element.style) {
        var img = images(element.style.width, element.style.height)
        console.log("width:", element.style.width, 'height:',element.style.height)
        if (element.style['background-color']) {
            let color = element.style['background-color'] || "rgb(0,0,0)"
            color.match(/rgb\((\d+),(\d+),(\d+)\)/)
            console.log("color:", RegExp.$1, RegExp.$2, RegExp.$3)
            img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3), 1)
            // img.fill(255,0,0, 1)
            console.log("left:", element.style.left, element.style.right)
            viewport.draw(img, element.style.left || 0, element.style.right || 0)
        }
    }

    if (element.children) {
        for (var child of element.children) {
            render(viewport, child)
        }
    }
}

module.exports = render