---
id: css-property-order
title: CSS Property Order
tagline: How to order CSS properties by type.
date: 2022-12-22
image: /blog/css-property-order/css-property-order-by-lucas-george-wendt.jpg
imageAlt: Pencils aligned and orderd like a rainbow.
imageSocial: /blog/css-property-order/css-property-order-by-lucas-george-wendt.jpg
categories:
  - Web Development
tags:
  - CSS
  - property
  - order
  - CSSArchitecture
---

I like to order my CSS properties by type. It helps me to understand the CSS code faster and I know where I can find specific properties because they are always in the same group.

There was a [poll on CSS Tricks in 2012](https://css-tricks.com/poll-results-how-do-you-order-your-css-properties/) about CSS property order and most people order there properties grouped by type (45 %) or randomly (39 %).

I myself group the properties into four groups: Positioning, Display and Box Model, Appearance, Typography.

Here is an example:

```CSS
main {
  /* Positioning */
  position
  top
  right
  bottom
  left
  float
  clear
  z-index

  /* Display and Box Model */
  content
  display
  vertical-align
  flex-direction
  justify-content
  grid-template-columns
  grid-template-areas
  grid-gap
  align-items
  width
  height
  margin
  padding
  box-sizing
  overflow
  visibility

  /* Appearance */
  background
  border
  box-shadow
  cursor
  list-style
  resize
  opacity
  transform
  transition
  animation

  /* Typography */
  color
  font-family
  font-size
  font-weight
  line-height
}
```
