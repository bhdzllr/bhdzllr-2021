---
id: fetch-api-error-handling
title: JavaScript Fetch API Error Handling 
tagline: 'Learn how to handle errors when using the JavaScript Fetch API.'
date: 2023-05-08
image: /blog/fetch-api-error-handling/console-errors.jpg
imageAlt: 'Errors in the browser console with red exclamation mark and font color: An unknown error has occured; Ooops, something went wrong. Please try again later;'
imageSocial: /blog/fetch-api-error-handling/console-errors.jpg
categories:
  - Web Development
tags:
  - JavaScript
  - FetchAPI
  - ErrorHandling
  - Exceptions
---

The JavaScript Fetch API is used to make HTTP requests and handle responses in the browser. It is a replacement for the outdated `XMLHttpRequest` object and has more options for customizing the request, like adding headers or query parameters. It's based on Promises therefore allows cleaner code for handling asynchronous operations.

A simple request that expects JSON as content type can look like this:

```JavaScript
async function load() {
  const response = await fetch('https://api.github.com/repos/getify/You-Dont-Know-JS/issues?per_page=5');
  const data = await response.json();
  console.log(data);
}

load();
````

Pretty simple. But there are a lot of errors that can happen during the request:

* The requested resource can be offline or not available
* The request might be successful, but the server might return an HTTP error
* The request might be successful, the server might return HTTP status 200 OK, but parsing the response body can fail (e.g. because JSON is expected but got something else like HTML or XML)
* The request may be canceled before it completes, e.g. it may be possible to cancel an request before starting a new one

The following code takes care of these cases:

```JavaScript
let isLoading = false;
let hasError = false;

async function load() {
  try {
    isLoading = true;

    const response = await fetch('https://api.github.com/repos/getify/You-Dont-Know-JS/issues?per_page=5');

    if (!response.ok) throw new Error('Response was not OK.');

    const data = await response.json();
    console.log(data);

    hasError = false;
  } catch (e) {
    hasError = true;
    console.error('Error loading GitHub issues: ', e.message);
  } finally {
    isLoading = false;
  }
}

load();
````

The code performs a request to GitHub to load issues from a repository. If there is a network problem, the response is not OK or the response body can not be parsed the error is caught and a message is printed to the console.

There are also two boolean variables `isLoading` and `hasError` to set a state of the request.

It's possible to react to different types of errors or throw other types of errors. As an example there could be an `NotFoundError` if the status code is 404.

```JavaScript
+++const ac = new AbortController();
const signal = ac.signal;

setTimeout(() => ac.abort(), 300); // Simulate abort/+++

let isLoading = false;
let hasError = false;

async function load() {
  try {
    isLoading = true;

    const response = await fetch('https://api.github.com/repos-will-fail/getify/You-Dont-Know-JS/issues?per_page=5');

+++    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('Not Found');
      }
      
      throw new Error('Response was not OK.');
    }/+++

    const data = await response.text();
    console.log(data);

    hasError = false;
  } catch (e) {
+++    if (e instanceof NotFoundError) {
      console.error('Resource not found.');
      return;
    } else if (e.name === AbortError) {
      console.error('Request was aborted');
    }/+++
  
    console.error('Error loading GitHub issues: ', e.message);

    hasError = true;
  } finally {
    isLoading = false;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

load();
````

The code above implements a custom error `NotFoundError` that extends `Error`. If the response of the request has a status code of 404 the custom error is thrown. Inside the catch block there is a check for the custom error, otherwise the general console error message is printed.

As mentioned above the fourth case can be that a request is aborted. To abort a request a `AbortController` is needed. The created `signal` must then be passed as an option of the fetch operation.

If the request is aborted an `AbortError` will be thrown. The type of the error is `DOMException` and the name is `AbortError`. This is why the name is used to check for an `AbortError`.

The Fetch API is great for making HTTP requests. It's important to understand how to handle errors to ensure that requests are reliable and help provide a good user experience.


## Links

* [Fetch API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
* [Implement error handling when using the Fetch API (web.dev)](https://web.dev/fetch-api-error-handling/)
* [Custom Errors (JavaScript.info)](https://javascript.info/custom-errors)
