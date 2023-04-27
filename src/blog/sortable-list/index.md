---
id: sortable-list
title: Creating a simple sortable list with JavaScript
tagline: "How to create an interactive sortable list with drag-and-drop and touch functionality in JavaScript."
date: 2023-04-27
image: /blog/sortable-list/sorting-by-kelly-sikkema.jpg
imageAlt: A hand sorting a piece of paper into a collection of other pieces of paper on a table.
imageSocial: /blog/sortable-list/sorting-by-kelly-sikkema.jpg
categories:
  - Web Development
tags:
  - JavaScript
  - Sortable
  - List
  - DragAndDrop
  - Touch
  - HTML
---

The following JavaScript code is used to create a drag-and-drop and touch functionality for a list of items on a website. It can be used with the mouse and also supports touch events.

This is source of [the final HTML document](demo.html), an explanation follows afterwards.

```HTML
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>Sortable List Demo - Creating a simple sortable list with JavaScript - @bhdzllr</title>

    <meta name="description" content="Sortable List Demo" />
    <meta name="robots" content="index, follow" />

    <style>
      html,
      body {
        margin: 0;
        padding: 0;

        background: #ffffff;
        
        color: #222222;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 1em;
        line-height: 1.625em;
      }

      body {
        min-width: 500px;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
      }

      ul {
        margin: 0;
        padding: 0;

        list-style: none;
      }

      li {
        display: block;
        padding: 1rem;

        border: 1px solid silver;
      }

      [data-i="0"] {
        background-color: #dedede;
      }

      [data-i="4"] {
        background-color: #efefef;
      }
    </style>
  </head>
  <body>
    <ul class="js-sortable-list">
      <li data-i="0">1. One</li>
      <li data-i="1">2. Two</li>
      <li data-i="2">3. Three</li>
      <li data-i="3">4. Four</li>
      <li data-i="4">5. Five</li>
    </ul>

    <script>
      function initSortableList(el) {
        const items = el.children;
        let dragSrcEl;
        let dragSrcStartY;
        let dragSrcParent;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          item.draggable = true;

          /** Drag and Drop */

          item.addEventListener('dragstart', function (e) {
            dragSrcEl = this;
            dragSrcStartY = e.clientY;
            dragSrcParent = this.parentNode;

            dragSrcEl.style.opacity = '0.2';

            e.dataTransfer.effectAllowed = 'move';
          });

          item.addEventListener('dragover', function (e) {
            e.preventDefault();

            e.dataTransfer.dropEffect = 'move';

            if (dragSrcEl === this) return;

            if (dragSrcStartY <= e.clientY) {
              dragSrcParent.insertBefore(this, dragSrcEl);
            } else {
              dragSrcParent.insertBefore(dragSrcEl, this);
            }

            dragSrcStartY = e.clientY;

            return false;
          });

          item.addEventListener('dragend', function () {
            dragSrcEl.style.opacity = '1';
            dragSrcEl = null;
            dragSrcStartY = null;
          });

          /** Touch */

          let clone;
          let rect;
          let prev;
          let next;

          item.addEventListener('touchstart', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];

            dragSrcEl = this;
            dragSrcStartY = touch.clientY;
            dragSrcParent = this.parentNode;

            dragSrcEl.style.opacity = '0.2';

            const style = getComputedStyle(this);
            let padding = 0;
            if (style.getPropertyValue('box-sizing') === 'content-box') {
              padding = parseInt(style.getPropertyValue('padding-left').replace('px', '')) + parseInt(style.getPropertyValue('padding-right').replace('px', ''));
            }

            clone = this.cloneNode(true);
            rect = this.getBoundingClientRect();

            clone.style.opacity = '0.5';
            clone.style.position = 'absolute';
            clone.style.width = rect.width - padding + 'px';
            clone.setAttribute('aria-hidden', 'true');
            el.appendChild(clone);

            clone.style.top = e.changedTouches[0].clientY - (rect.height / 2) + 'px';
            clone.style.left = rect.left + 'px';

            prev = item.previousElementSibling;
            next = item.nextElementSibling;
          });

          item.addEventListener('touchmove', function (e) {
            const touch = e.touches[0];

            clone.style.top = e.changedTouches[0].clientY - (rect.height / 2) + 'px';
            clone.style.left = rect.left + 'px';

            if (touch.clientY > dragSrcStartY) {
              // Move down
              if (next && touch.clientY >= next.getBoundingClientRect().top) {
                dragSrcParent.insertBefore(next, dragSrcEl);
                next = dragSrcEl.nextElementSibling;
                prev = dragSrcEl.previousElementSibling;
              }
            } else {
              // Move up
              if (prev && touch.clientY <= prev.getBoundingClientRect().bottom) {
                dragSrcParent.insertBefore(dragSrcEl, prev);
                next = dragSrcEl.nextElementSibling;
                prev = dragSrcEl.previousElementSibling;
              }
            }
          });

          item.addEventListener('touchend', function (e) {
            dragSrcEl.style.opacity = '1';
            dragSrcEl = null;
            dragSrcStartY = null;

            clone.remove();
          });
        }
      }

      initSortableList(document.querySelector('.js-sortable-list'));
    </script>
  </body>
</html>
```

The HTML and CSS is nothing special. Just a unordered list with some items and a little bit of styling. The CSS Class `js-sortable-list` is used to identifiy a sortable list. The attribute `draggable` will be added later via JavaScript.

The drag and drop functionality uses three events: dragstart, dragover and dragend.

In the `dragstart` event the current dragged element, the parent and the current Y position of the mouse are stored. The opacity of the element is set to 0.2 and `e.dataTransfer.effectAllowed` is used to adopt the mouse cursor.

For the data to be dragged the variable `dragSrcEl` is used and holds the element instead of using `e.dataTransfer` object with `setData()` because later the element is moved in the DOM and the DataTransfer object can only use specific types of data like `text/html` or `text/plain`.

If the element is dragged over another element the `dragover` event is fired. It checks if the element is moved up or down (therefore the Y position was stored) and than is moved instantly with `insertBefore()` and the Y position is updated for the next `dragover` event.

The line `e.preventDefault()` in `dragover` is necessary if there is also a `drop` event. Without preventing the default behavior, the `drop` event would not be fired.

If the element is released the `dragend` event is triggered and resets the opacity, the dragged element and the Y position. 

This is all to have a sortable list that can be used with drag and drop.

Unfortunately, this does not work on touch devices, so other events are necessary: touchstart, touchmove, touchend.

Compared to drag and drop the touch functionality needs more code, because the effect of dragging the current element needs to be implemented. This is done in the `touchstart` event by creating a clone of the currently touched element. The clone is than appended as last element of the list but positioned over the touch position.

While the element is moved, the position of the clone get's updated. After checking if the element is moved up or down the `insertBefore()` method is used to move the element instantly.

When touching stops the `touchend` events resets the variables and removes the cloned element.

This is an example of how a sortable list could work, whereby it should be considered whether touch events should really be supported or a handle or buttons should be offered as an alternative on touch devices.
