---
id: apfel-menu
title: Apfel Menu
tagline: 'Apple website menu rebuilt just for my own improvement and fun.'
date: 2022-08-12
pinned: true
image: /projects/apfel-menu/apfel-menu-cover.jpg
imageAlt: 'A mix of two desktop and two mobile screenshots from my own implementation of the apple website menu.'
imageSocial: /projects/apfel-menu/apfel-menu-cover.jpg
year: 2022
action: https://bhdzllr.github.io/apfel-menu/
categories:
  - Web Development
  - Fun
tags:
  - web
  - development
  - fun
  - apfel
  - apple
  - website
  - menu
  - navigation
---

## Idea

I rebuilt the apple website menu just for my own improvement and fun.

The menu has a lot of small details that I realized while building it, like the animations that took me some time.

I didn't include the search with auto-completion and suggestions.


## Implementation

The menu uses JS but also works without JS or CSS and I paid attention to accessibility (like screen readers or keyboard navigation).

CSS is the heavy part with 1200 lines. I totally underestimated it when I choose to do it, because it's just a menu. But there are a lot of details in it.

A lot of CSS is just transitions and transforms. I tinkered a lot to make it feel like on apples website. Sometimes there are small differences between mobile and desktop version so duplicated lines with minimal changes. I also tried to make the switch between desktop and mobile smooth, even when some features are active like when the search is open.

Also I tried to make everything work as good as possible without JavaScript. The JavaScript code is about 200 lines, but only for progressive enhancement and accessibility. The 200 lines of HTML also have a lot of SVGs directly embedded which I did myself.

The [full code is available on GitHub](https://github.com/bhdzllr/apfel-menu).


## How it's going

The project is done and I built it in 2022. Meanwhile (start of 2023), Apple has implemented a new navigation on there website.

I posted the result on [Hacker News](https://news.ycombinator.com/item?id=32562835) and [Reddit (r/webdev)](https://www.reddit.com/r/webdev/comments/xay1vr/i_rebuilt_the_apple_website_menu/).


## Gallery

{{#gallery}}
  {{galleryImage '/projects/apfel-menu/apfel-menu-cover.jpg' 'A mix of two desktop and two mobile screenshots from my own implementation of the apple website menu.'}}
{{/gallery}}
