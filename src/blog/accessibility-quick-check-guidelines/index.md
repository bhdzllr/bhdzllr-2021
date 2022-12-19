---
id: accessibility-quick-check-guidelines
title: Accessibility Quick Check Guidelines
tagline: This guidelines help to make a quick and easy accessibility check on a website.
date: 2022-12-19
image: /blog/accessibility-quick-check-guidelines/vienna-railway-station-by-quaritsch-photography.jpg
imageAlt: Vienna main station buides for blind people on the floor with orange sun lens flair and people in the background.
imageSocial: /blog/accessibility-quick-check-guidelines/vienna-railway-station-by-quaritsch-photography.jpg
categories:
  - Accessibility
tags:
  - accessibility
  - guidelines
  - wcag
---


This guidelines are not definitiv but allow a good first review.

It is important to test pages with screen readers, e. g. NVDA for Windows or Voice Over on macOS.

## Page Title

Page title should be visible in browser window and tab, can be read by screen readers and describes the current page. On subpages the website name should come after the page title.

## Page Structure

Pages should be structured with headings to enable easier navigation also with screen readers and should have a main landmark (HTML main element).
HTML tags with implicit meaning should be used, like header, nav, main, footer.
Some HTML tags should have a heading or label, like nav or section.
It is recommended to use only one level one heading `h1` on every page. 
No level should be skipped.
Tables should use the `scope` attribute and need no `summary` attribute but a caption or a description after the table.

## Image Alternative Text

Images should have alternative text with (`alt` attribute). If an image is decorative the alternative text can be empty.
Logos should have an alternative text too. It is recommended to keep the word "Logo" not at the start of the alternative text. If the logo contains text, the text should be part of the alternative text.
Icons should use the attribute `aria-hidden="true"`. SVGs only need title or description tag if they are embedded.

[More about Accessible SVGs on CSS-Tricks](https://css-tricks.com/accessible-svgs/)

## Contrast

Text should have a contrast ratio of minimum 4.5:1.
There are browser plugins to check the contrast of a web page.
Some parts may not be able to be checked by tools and need a manual check, e.g. text over images maybe with color overlay.

[Manual check on WebAIM Website](https://webaim.org/resources/contrastchecker/)


## Text Resizing

Websites should be able to resize text and the text must be stay readable. No elements should hide or overlap other elments or text even after resizing. Zooming should not be disabled in the viewport meta tag.

## Keyboard Navigation

Focus on the page should be visible when navigating with the tab key.
Skip Links should be provided to jump over parts of the page with the keyboard, e.g. to skip navigation.
A mobile menu may close after the last focusable item if the next focusable item is on the page.
There are exceptions for non-essential parts of the website and parts that have alternatives, e.g. videos or a interactive map.
The currently focused element must be clearly visible during keyboard navigation (outline).
Content that is not visible at the moment should not be focusable, e.g. content inside accordions or tabs.

## Links

Links need to have a describing text and should have a reference. Links with the same description should have the same reference.
Text like "click here or "more" should be avoided or should have additional information for screen readers.
It is recommended to underline links in text to not only rely on color for visual indication.
Links with `role="button"` need to behave like buttons. If the action happens on the current page in most cases a button element is a better choice.
Buttons are allowed to be used outside of forms.
The link to the current page may have the aria attribute `aria-current="page"`, e.g. in breadcrumb or main navigation. 
Is is recommended to add additional information to external links, e.g. as screen reader text or within the `title` attribute; Example: Link to a webshop "Webshop (external website opens in a new window)".
It is OK to use JavaScript for adding or changing (aria) attributes, e.g. `aria-expanded`.

## Forms

Form fields should have labels, [placeholders are not recommended](https://www.nngroup.com/articles/form-design-placeholders/).
Fields that are required need to be marked, e.g. with some text like "required" or a symbol (\*) in the label. If only a symbol is used, a description of the symbol is necessary, e.g. before the form or inside the label as screen reader text.
Attributes "required" and "aria-required" should be used.
Colors should also be used to mark invalid fields.
The labels or submit button are allowed to be only visible to screen readers but for usability it's better to show them for everyone.
Results and changes should be read, e.g. `aria-live="polite"`.

## Motion

Content in motion should be able to pause, stop or hide.
No content should flash or blink more then three times in one second.

## Audio Video

Audio and Video content should have a text alternative (Transkript).

## Markup Validation

HTML markup should be validated, e.g. with [W3C Validator](validator.w3.org/).

Looking for:

* Warning about resize prevention in viewport
  Resizing is prevented with e. g. "initial-scale=1, maximum-scale=1.0, user-scalable=0"
  "maximum-scale=1.0, user-scalable=0" can be removed
* Errors about headlines and structure
* Complete start and end tags
* Missing or duplicated Attributes
* Missing alt-Attributes or texts
* Wrong nesting (e. g. div nested inside ul)
* Wrong use of ARIA Role
* Duplicated IDs

## Appendix

### Testing Tools

* [WAVE Accessibility Check](https://wave.webaim.org/), as plugin for Chrome, Edge and Firefox
* [aXe Accessibilty Check](https://www.deque.com/axe/), also as plugin for Chrome, Edge and Firefox
* Google Lighthouse Accessibility (Chrome Developer Tools)

### Screenreaders

* [NVDA](https://www.nvaccess.org/) (Screenreader,
* Android TalkBack bzw. Andriod Accessibility Suite
* iOS VoiceOver

### Links

* [WCAG 2.1](https://www.w3.org/TR/WCAG21/)
* [W3 Accessibility Easy Checks](https://www.w3.org/WAI/test-evaluate/preliminary/)
* [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
* [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
* [APG Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
