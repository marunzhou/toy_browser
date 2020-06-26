/*
 * @Description: 解析标签
 * @Author: 马润洲
 * @Date: 2020-05-15 08:27:17
 * @LastEditTime: 2020-05-18 10:41:36
 * @LastEditors: 马润洲
 */
// 状态机结束
const css = require('css')
const layout = require('./layout')
const EOF = Symbol('EOF') // EOF： end of file
let currentToken = null
let currentAttribute = null
let currentTextNode = null
let stack = [{ type: 'document', children: [] }]
let rules = []

// 通过css转化style 文本为ast树
/**
body {
  background: #eee;
  color: #888;
}
解析后如下：
 {
  "type": "stylesheet",
  "stylesheet": {
    "rules": [
      {
        "type": "rule",
        "selectors": [
          "body"
        ],
        "declarations": [
          {
            "type": "declaration",
            "property": "background",
            "value": "#eee",
            "position": {
              "start": {
                "line": 2,
                "column": 3
              },
              "end": {
                "line": 2,
                "column": 19
              }
            }
          },
          {
            "type": "declaration",
            "property": "color",
            "value": "#888",
            "position": {
              "start": {
                "line": 3,
                "column": 3
              },
              "end": {
                "line": 3,
                "column": 14
              }
            }
          }
        ],
        "position": {
          "start": {
            "line": 1,
            "column": 1
          },
          "end": {
            "line": 4,
            "column": 2
          }
        }
      }
    ]
  }
}
 */
function addCssRules(text) {
   let ast = css.parse(text)
   
   rules.push(...ast.stylesheet.rules)
   // console.log(rules)
}

/**
 * 由内向外计算css
 * @param {Object} element 
 */
function computeCSS(element) {
   // 将当前的节点元素浅拷贝并反转，形成由内向外的顺序
   let elements = stack.slice().reverse()
   let matched = false
   if (!element.computedStyle) {
      element.computedStyle = {}
   }

   for (let rule of rules) {
      var selectorParts = rule.selectors[0].split(" ").reverse()
      // console.log('--------------selectorParts----------', selectorParts[0])
      if (!match(element, selectorParts[0])) {
         continue
      }
      
      let j = 1
      for (let i = 0; i < elements.length; i++) {
         // 当前规则所有选择器都能匹配上
         if (match(elements[i], selectorParts[j])) {
            j++
         }
      }

      if (j >= selectorParts.length) {
         matched = true
      }

      if (matched) {
         // 匹配成功 需要计算优先级
         let sp = specificity(rule.selectors[0])
         let computedStyle = element.computedStyle

         for (let declaration of rule.declarations) {
            if (!computedStyle[declaration.property]) {
               computedStyle[declaration.property] = {}
            }
            if (!computedStyle[declaration.property].specificity) {
               computedStyle[declaration.property].value = declaration.value
               computedStyle[declaration.property].specificity = sp
            } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
               computedStyle[declaration.property].value = declaration.value
               computedStyle[declaration.property].specificity = sp
            }
         }
      }
   }
}
/**
 * 匹配css选择器
 * @param {*} element 节点元素
 * @param {*} selector css选择器
 */
function match(element, selector) {
   if (!selector || !element.attributes) {
      return false
   }

   // #id
   if (selector.charAt(0) === '#') {
      let attr = element.attributes.filter(attr => attr.name === 'id')[0]
      if (attr && `#${attr.value}` === selector) {
         return true
      }
   } else if (selector.charAt(0) === '.') {
      // .cls
      // todo 实现空格 class匹配
      let attr = element.attributes.filter(attr => attr.name === 'class')[0]
      if (attr && `.${attr.value}` === selector) {
         return true
      }
   } else {
      // tagName
      if (element.tagName === selector) {
         return true
      }
   }

   return false
}

function specificity(selector) {
   // 内联， id， 类， 标签名
   let p = [0, 0, 0, 0]
   let selectorParts = selector.split(" ")

   for (var part of selectorParts) {
      if (part.charAt(0) === '#') { // index = 1
         p[1] += 1
      } else if (part.charAt(0) === '.') { // index = 2
         p[2] += 1
      } else { // index = 3
         p[3] += 1
      }
   }

   return p
}

function compare(sp1, sp2) {
   if (sp1[0] - sp2[0]) {
      return sp1[0] - sp2[0]
   }
   if (sp1[1] - sp2[1]) {
      return sp1[1] - sp2[1]
   }
   if (sp1[2] - sp2[2]) {
      return sp1[2] - sp2[2]
   }

   return sp1[3] - sp3[3]
}

function emit(token) {
   let top = stack[stack.length - 1]

   if (token.type === 'startTag') {
      let element = {
         type: 'element',
         children: [],
         attributes: []
      }
      element.tagName = token.tagName

      for (let p in token) {
          if (p != 'type' && p != 'tagName') {
             element.attributes.push({
                name: p,
                value: token[p]
             })
          }
      }

      computeCSS(element)
      layout(element)
      top.children.push(element)
      element.parent = top

      if (!token.isSelfClosing)
         stack.push(element)

      
      currentTextNode = null
   } else if (token.type === 'endTag') {
      if (top.tagName != token.tagName) {
         throw new Error("Tag start end doesn't match!")
      } else {
         if (top.tagName === 'style') {
            addCssRules(top.children[0].content)
         }
         
         stack.pop()
      }
      layout(top)
      currentTextNode = null
   } else if (token.type === 'text') {
      if (currentTextNode == null) {
         currentTextNode = {
            type: 'text',
            content: ""
         }
         top.children.push(currentTextNode)
      }
      currentTextNode.content += token.content
   }
}
// 状态机-起始方法
function data(c) {
   if (c === '<') {
      return tagOpen
   } else if (c === EOF) {
      // 返回dom对象
      emit({
         type: "EOF"
      })
      return ;
   } else {
      emit({
         type: "text",
         content: c
      })
      return data;
   }
}

// < 开始标签
// /[a-zA-Z]> 开始标签
// /> 自闭合标签
function tagOpen(c) {
   if (c === '/') {
      return endTagOpen
   } else if (c.match(/[a-zA-Z]/)) {
      currentToken = {
         type: 'startTag',
         tagName: ''
      }
      return tagName(c)
   }
}

// 标签结束
function endTagOpen(c) {
   if (c.match(/^[a-zA-z]$/)) {
      currentToken = {
         type: 'endTag',
         tagName: ""
      }
      return tagName(c)
   } else if (c === '>') {
      return data(c)
   } else if (c === EOF) {

   } else {
      
   }
}

function tagName(c) {
   // 属性的开始
   if (c.match(/^[\t\n\f ]$/)) {
      return beforeAttributeName
   } else if (c === '/') {
      return selfClosingStartTag
   } else if (c.match(/^[a-zA-Z]$/)) {
      currentToken.tagName += c//.toLowerCase()
      return tagName
   } else if (c === '>') {
      // 标签名获取结束
      emit(currentToken)
      return data
   } else {
      return tagName
   }
}

function beforeAttributeName(c) {
   if (c.match(/^[\t\n\f ]$/)) {
      return beforeAttributeName
   } else if (c === '/' || c === '>' || c === EOF) {
      return afterAttributeName(c)
   } else if (c === '=') {
      
   } else {
      currentAttribute = {
         name: '',
         value: ''
      }
      return attributeName(c)
   }
}

// 处理属性名
function attributeName(c) {
   // / 自闭合标签; > 闭合标签
   if (c.match(/^[\t\n\f ]$/) || c === '/' || c == '>' || c == EOF) {
      return afterAttributeName(c)
   } else if (c === '=') {
      return beforeAttributeValue
   } else if (c == "\u0000") { // 这是空格 " "

   } else if (c == "\"" || c == "'" || c == "<") {
   } else {
      currentAttribute.name += c
      return attributeName
   }
}
function beforeAttributeValue(c) {
   if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c == EOF) {
      return beforeAttributeValue
   } else if (c === '"') {
      return doubleQuoteAttributeValue
   } else if (c === "\'") {
      return singleQuoteAttributeValue
   } else if (c === '>') {
      
   } else {
      return unquoteAttributeValue(c)
   }
}
function doubleQuoteAttributeValue(c) {
   if (c === "\"") {
      currentToken[currentAttribute.name] = currentAttribute.value
      return afterQuoteAttributeValue
   } else if (c == "\u0000") {

   } else if (c === EOF) {

   } else {
      currentAttribute.value += c
      return doubleQuoteAttributeValue
   }
}
function singleQuoteAttributeValue(c) {
   if (c === "\'") {
      currentToken[currentAttribute.name] = currentAttribute.value
      return afterQuoteAttributeValue
   } else if (c == "\u0000") {

   } else if (c === EOF) {

   } else {
      currentAttribute.value += c
      return singleQuoteAttributeValue
   }
}
function afterQuoteAttributeValue(c) {
   if (c.match(/^[\t\n\f ]$/)) {
      return beforeAttributeName
   } else if (c === '/') {
      return isSelfClosing
   } else if (c === '>') {
      currentToken[currentAttribute.name] = currentAttribute.value
      emit(currentToken)
      return data
   } else if (c === EOF) {

   } else {
      currentAttribute.value += c
      return doubleQuoteAttributeValue
   }
}
function unquoteAttributeValue(c) {
   if (c.match(/^[\t\n\f ]$/)) {
      currentToken[currentAttribute.name] = currentAttribute.value
      return beforeAttributeName
   } else if (c === '/') {
      currentToken[currentAttribute.name] = currentAttribute.value
      return isSelfClosing
   } else if (c === '>') {
      currentToken[currentAttribute.name] = currentAttribute.value
      emit(currentToken)
      return data
   } else if (c == "\u0000") {

   } else if (c === "\"" || c === "\'" || c === "<" || c === "=" || c === "`") {

   } else if (c === EOF) {

   } else {
      currentAttribute.value += c
      return unquoteAttributeValue
   }
}

function attributeValue(c) {}

function afterAttributeName(c) {
   if (c.match(/^[\t\n\f ]$/) || c === '/' || c == EOF) {
      return attributeName
   } else if ( c === '>') {
      return data
   }
}

function selfClosingStartTag(c) {
   if (c === '>') {
      currentToken.isSelfClosing = true
      return data
   } else if (c === EOF) {

   } else {

   }
}


module.exports.parseHTML = function parseHTML(html) {
   let state = data
   
   for (let c of html) {
      state = state(c)
   }

   state = state(EOF)

   return stack
}