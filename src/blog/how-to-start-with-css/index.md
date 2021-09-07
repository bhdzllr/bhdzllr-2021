---
id: how-to-start-with-css
title: How to start with CSS
tagline: Learn about the CSS box model and how to position elements.
date: 2021-09-06
image: /blog/how-to-start-with-css/css-source-code.jpg
categories:
  - Web Development
tags:
  - learn
  - web
  - development
  - html
  - css
  - box model
  - positioning
  - layout
---

The first things I learned about CSS were the box model and positioning and these two things I want to describe in this article. 

## Short history

There are many ways to create a layout on the web with CSS. That has not always been the case: At the beginning of the internet in the early nineties web pages did not really had a design or layout. Later, web designers started to use tables to layout webpages. There was also the opportunity to use framesets. But both techniques had disadvantages and problems in terms of accessibility and usability.

### Tables

At first using tables to layout pages seems logical because it was easy to divide the content into columns and create grids. But there are a lot of things why using tables for page layouts is not beneficial:

* No semantic markup. Tables have a different purpose: Displaying tabular/2D data
* Content and design are not separated
* Negatively affect screen readers and text browsers 
* Making a table layout responsive is hard
* More code and harder to maintain (often code is split into chunks of different files)
* Because of more code slower loading and rendering

### Frames

With framesets it is possible to show content in different areas of a page and to have always the same specific areas (for example, the navigation) or change specific areas, for example when you click a link in the navigation to change the main area.

Frames conflict with the original idea of the web. The URL does not contain the complete information of the displayed content. The URL shows the frameset not the originally displayed page. Like with tables it is also hard to make them responsive.

The website "The History of the Web" from Jay Hoffmann has an [interesting article about Table and Frame layouts](https://thehistoryoftheweb.com/tables-layout-absurd/).

## Why CSS?

I myself used both, frames and tables, for a short time until I discovered CSS. 

CSS (Cascading Style Sheets) is a style sheet language. With this language authors and users are able to perform formatting on their structured documents, for example HTML or XML documents and applications. With CSS the content and the presentation of a web page are separated and it is easier to create and maintain web pages.

Advantages of CSS:

* Presentation is separated from structure
* Easier to maintain the whole website layout
* Avoids duplication because with CSS the same appearance can be defined for different elements

## Adding style to a document

A minimal HTML document could look like that:

```HTML
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    <title>How to start with CSS</title>

    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <p>Hello, CSS!</p>
  </body>
</html>
```

To add style to a document CSS rules are used. A CSS rule has a selector and declarations. Declarations consist of properties and values.
The simplest selector consists of an assignment to an HTML element. In the following exampel `p` is the selector and selects all paragraph elements in the document. The property `color` with the value `limegreen` is used to make the text of all paragraphs appear in limegreen.

```CSS
p {
  color: limegreen;
}
```

### Inline

To add style instructions, you can insert them directly in the HTML tag. This is called inline style. Usually this is only useful if a single area on a website should be formatted. Using this method too much can lead to confusion, is hard to maintain and error-prone. The following inline style makes the text "Hello, CSS!" appear in the color "limegreen". After the semicolon more declarations can be added. A selector is not necessary because the inline style is already attached to an element.

```HTML
<p style="color: limegreen;">Hello, CSS!</p>
```

### Document Head (Internal)

Another option is to add the styles in the head of the HTML document. Advantage over inline styles is that the style can be defined once and is applied for the entire document.

```HTML
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>How to start with CSS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ***
    <style>
      p {
        color: limegreen;
      }
    </style>/***

  </head>
  <body>
    <p>Hello, CSS!</p>
  </body>
</html>
```

### Linked Stylesheet with external file (External)

The most common way is to use an external file. In this way, different pages can use a common stylesheet. All rules are concentrated in one place and it is easy to make changes to the whole website layout. The stylesheet will also be cached and therefore loads faster on the following pages. The CSS rules are inserted into the file as described above.

```HTML
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>How to start with CSS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

  ***  <link rel="stylesheet" type="text/css href="path/to/style.css" />  /***

  </head>
  <body>
    <p>Hello, CSS!</p>
  </body>
</html>
```

```CSS
/* style.css */
p {
  color: limegreen;
}
```

## Elements

There are many semantic elements to structure a page, e.g. `header`, `article` or `footer`. There is also the element `div` (Divider) which is used as a generic container to group and style content. By default, there is no effect on content or layout.

Keep in mind, that `section` is not a replacement for `div`.

## Box Model

To understand web layouts it is important to know two things: the box model and the element types (e. g. block and inline).

In CSS all elements are shaped like boxes. Every box could be described with properties like width, height, margin, padding, border or position. By default the full width and height of a box does not calculate form all values. Only the content defines the width or height. For example if an element had a width of 200 pixels, a margin of 10 pixels, a padding of 10 pixels and a border of 1 pixel the box is 222 pixels broad because the margin is outside of the box and padding and border is included.

<hbs>
{{image "/blog/how-to-start-with-css/box-model-content-box.png" "Box with default box-sizing 'content-box' and a width of 222 pixels."}}
</hbs>

This behavior can be changed with the property `box-sizing`, the default value is `content-box`. To make the example box 200 pixels broad we can set the value to `border-box`. This will result in a box that has 200 pixels. The padding and border are now included in the box.

<hbs>
{{image "/blog/how-to-start-with-css/box-model-border-box.png" "Box with box-sizing 'border-box' and a width of 200 pixels."}}
</hbs>

Another important detail is that the margins of boxes collapse. This means that the bigger margin is the margin between the boxes and not both margins together. So if two boxes each have a margin of 10 pixels, the margin between them is not 20 pixels, instead is 10 pixels because they collapse.

<figure>
  <hbs>
  {{image "/blog/how-to-start-with-css/box-model-collapsing-margins.png" "Two boxes. First box with default box-sizing 'content-box' has a width of 222 pixels. Second box with box-sizing 'border-box' has a width of 200 pixels."}}
  </hbs>
  <figcaption>Two boxes with different "box-sizing" and collapsing margins (<a href="box-model-demo.html">Box Model Demo</a>).</figcaption>
</figure>

In addition, the type of an element is decisive for the behavior. Elements have a specific type by default. Normally elements had the type `block` or `inline`. But there are more types like `inline-block`, `table`, `list-item`, `flex` or `grid`.

Block elements have an automatic line break before and after itself. They fit to the available space of the parent element.

Inline elements do not break the line, stay in the text flow and are only as wide as the content. Setting the properties width, height or margin does not influence inline elements.

It is possible to change the default type of an element with the property `display`. For example it is possible to allocate a link (which is an inline element by default) as bock element and had then also had the behavior of an block element.

## Positioning

In addition to the `display` property, there is another one that is important for layouts, namely `position`. The property `position` handles the behavior of elements and subsequent elements and the position of them. There are five kinds of positions: static, relative, absolute, fixed and sticky.

With the properties "top", "bottom", "left" and "right" the horizontal and vertical position is set. This properties do not work for static positioned elements.

### Static

The default value is `static`. This means that one element is displayed after the other (the elements are in the document flow) like they are noted in the source code. If elements are positioned static and are inline or inline-block elements, they are arranged side by side till the end of the line.

<figure>
  <hbs>
  {{image "/blog/how-to-start-with-css/positioning-static.png" "Two boxes in the document flow. First box contains another block box and three inline-block boxes. Second box contains two block boxes."}}
  </hbs>
  <figcaption>The boxes are in the document flow, according to the order in the source code with some inline-block boxes inside the first box (<a href="positioning-demo.html">Positioning Demo</a>).</figcaption>
</figure>

In contrast to the other types of positioning, `static` does not create a new stacking context. The stacking context is a concept to move elements on the z-axis relative to the user. The order of elements is defined with the property `z-index`.

### Relative

Relative positioned elements are similar to static elements but they can be shift horizontally and vertically relative from their original position in the document flow. Elements with `relative` positioning do not affect other elements, but create a new stacking context.

<figure>
  <hbs>
  {{image "/blog/how-to-start-with-css/positioning-relative.png" "Three boxes in the document flow. The second box has a top and left offset of 50 pixels by using relative position."}}
  </hbs>
  <figcaption>The second box is offset by using relative positioning with the properties "top" and "left", each 50 pixels. There is a space between the first and the third box, because the second box is not removed from the document flow (<a href="positioning-demo.html">Positioning Demo</a>).</figcaption>
</figure>

### Absolute

An absolute positioned element as well can be moved horizontally and vertically but it is positioned relative to its next parent element that is also positioned.

An absolute positioned element is removed from the document flow and creats a new stacking context. Subsequent elements move to the original position of the absolute positioned element.

<figure>
  <hbs>
  {{image "/blog/how-to-start-with-css/positioning-absolute.png" "Three boxes, the second box has a top and left offset of 50 pixels by using absolute positioning."}}
  </hbs>
  <figcaption>The second box is offset by using absolute positioning with the properties "top" and "left". Because the box is positioned absolute, it is removed from the document flow and the third box appears right after the first box. Because all three boxes are wrapped with another box that is positioned relative, the absolute positioning is applied from the wrapper box. If there were no wrapping box in this example, absolute positioning would be applied from the document body. (<a href="positioning-demo.html">Positioning Demo</a>).</figcaption>
</figure>

### Fixed

Fixed elements are similar to absolute positioned elements, they are removed from the document flow but positioning is relative to the browser window. Elements with fixed positioning do not scroll, they keep their position on the screen.

<figure>
  <hbs>
  {{image "/blog/how-to-start-with-css/positioning-fixed.png" "Three boxes, the second box has a top and left offset of 50 pixels by using fixed positioning. This box always sticks to this position and scrolls withing the viewport."}}
  </hbs>
  <figcaption>The second box is offset by using fixed positioning with the properties "top" and "left". Because the box is positioned fixed, it is removed from the document flow and the third box appears right after the first box. The fixed box sticks to its position and scrolls withing the viewport (<a href="positioning-demo.html">Positioning Demo</a>).</figcaption>
</figure>

### Sticky

There is another property for positioning called `sticky`. The specification for this is still in progress (working draft) but has good [browser support](https://caniuse.com/css-sticky).

Sticky elements are similar to relative elements. The element scrolls until the edges reach a specified point (via "top", "right", "bottom" or "left"). When this point is reached, the element is fixed and no longer scrolls. With `sticky` positioning it is possible to create a navigation bar that scrolls with the content until a defined point and then stays at the top of the viewport.

<figure>
  <hbs>
  {{image "/blog/how-to-start-with-css/positioning-sticky.png" "Four boxes, the first remains visible at the top of the document when the upper edge is reached through scrolling."}}
  </hbs>
  <figcaption>This box stays on top of the page and scrolls in the viewport when the upper edge is reached through scrolling. The screenshot shows that the fixed box is above the sticky box. With the property "z-index" the sticky box can be moved to the foreground so that it is displayed in front of all other boxes (<a href="positioning-demo.html">Positioning Demo</a>).</figcaption>
</figure>

## Conclusion

I hope this article gave a little insight into the world of CSS and helps you get started. I would also be happy to answer any questions.

## Sources

* My own first bachelor thesis from 2013 called "Web Layouts: The evolution of web layouts and the new possibilities with CSS3"
* Kai Laborenz, CSS: Das umfassende Handbuch, Galileo Computing
* [MDN - Learn web evelopment: Positioning](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Positioning)
* [The History of the Web](https://thehistoryoftheweb.com/)

## Side note

When I started building website I wondered how I can have an area like the navigation on every page without having to copy the code part every time (and of course not always having to change every page when a menu item changes).

Most of the time, the website is divided into parts that can then be reused. There are several ways to achieve this. Possible solutions are template engines (e.g. Handlebars) with build tools or server-side rendering (e.g. with PHP include/require). If you are interested in such an article send me a tweet.
