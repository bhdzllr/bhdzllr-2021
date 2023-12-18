---
id: media-queries-javascript
title: Media Queries in JavaScript with matchMedia
tagline: "Using matchMedia() instead of resize event to check window size in JavaScript."
date: 2023-12-17
image: /blog/media-queries-javascript/media-queries-by-2h-media.jpg
imageAlt: A white table and a white phone on a flat white surface. Both with a black screen.
imageSocial: /blog/media-queries-javascript/media-queries-by-2h-media.jpg
categories:
  - Web Development
tags:
  - JavaScript
  - MediaQueries
  - window
  - matchMedia
  - resize
---

There are various use cases in JavaScript where knowing the screen width is essential. Unlike individual containers where the [ResizeObserver interface can be used](/blog/resize-observer-web-components/), the entire screen width is often needed, for instance, to display or hide certain parts of an application or to initiate or stop animations.

Consider an example of an interactive map with animated train routes that should only be displayed on devices with a specific screen width. To prevent the animation from running when the map is hidden, querying the screen width can be necessary.

The initial idea might be to listen for the `resize` event on window and then check the screen width. To make the event and the execution more efficient and performance-friendly, ensuring it's not executed too frequently, a toggle variable or the delayed execution of the resize event (debouncing) can be used:

```JavaScript
let wasFullVersion = false;

// Initial check
checkVersion();

window.addEventListener('resize', debounce(function (e) {
  console.log('resize', e);
  checkVersion();
}));

function checkVersion() {
  const isFullVersion = (window.innerWidth > 600) ? true : false;
  
  // Stop if nothing has changed
  if (isFullVersion === wasFullVersion) {
    return;
  }
  
  // Toggle
  wasFullVersion = isFullVersion;
  
  if (isFullVersion) {
    console.log('start animation');
  }

  if (!isFullVersion) {
    console.log('stop animation');
  }
}

function debounce(callback, delay = 300){
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = window.setTimeout(function () {
      callback(...args);
    }, delay);
  };
}
```

In the example code above, a debounce function is used. Within this function, another function is returned that resets the used timeout and creates a new timeout. This ensures that the original action of the resize event is only executed if the event has not been triggered for a certain period.

Additionally a variable `wasFullVersion` is used as a switch, so the actions are executed only when the switch had a different value before.

The function returned from the debounce function is the one called from the event listener. The arguments from this function are then passed to the callback function that calls `checkVersion()`. Using the spread operator `...` ensures that no matter how many parameters are passed, the same amount of parameters is passed to the callback function.

This is a lot of code just to be informed about a change in screen width.


## Luckily there is matchMedia()

With `matchMedia()` media queries can be used in JavaScript. The created media Queries can use an event listener and listen to changes:

```JavaScript
const mq = matchMedia('(min-width: 600px)');

// Initial check
checkVersion(mq.matches);

mq.addEventListener('change', function (e) {
  checkVersion(e.matches);
});

function checkVersion(matches) {
  if (matches) {
    console.log('start animation');
  } else {
    console.log('stop animation');
  }
}
```

This approach has full browser support, is much simpler, easier to understand and has better performance compared to the code above.
