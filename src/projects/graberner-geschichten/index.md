---
id: graberner-geschichten
title: Graberner GeschichteN
tagline: An Austrian history project that documents stories of the town Grabern (Lower Austria), funded by the state.
date: 2016-01-15
pinned: true
image: /projects/graberner-geschichten/graberner-geschichten.jpg
imageAlt: Graberner Geschichten Website Screenshot
imageSocial: /projects/graberner-geschichten/graberner-geschichten.jpg
year: 2016
action: https://www.grabernergeschichten.at/
categories:
  - Side Projects
  - Freelance
tags:
  - web
  - development
  - history
  - media
  - project
  - video
---

## Idea

Graberner GeschichteN (Graberner stories) is a media project that documents the history and stories of the inhabitants of the town Grabern in Lower Austria.

The original idea is from [Manuel Köllner](https://www.manuelkoellner.com/) and came to him while working in New York when he  remembered home and his desire for vivid memories. He told me about his idea and so it happened that we interviewed inhabitants of the town and published the result on a website.

Users can determine their own way through this interactive documentation by filtering video clips categorized according to time and topic.

The project is funded by Lower Austrian village and urban renewal and by the State of Lower Austria (art and culture).

## Implementation

To implement the website WordPress was used. For this I used my own [basic theme](https://github.com/bhdzllr/blankbase) and created a [child theme](https://github.com/bhdzllr/gschichtn-2016) from it. 

The child theme uses HTML, CSS (without preprocessor) and JavaScript with jQuery on the front end. The back end is WordPress and PHP with custom functions (e. g. for AJAX requests), post types, meta boxes and SEO optimizations. The website supports browsers down to Internet Explorer 7 with different CSS and JS polyfills.

The website also uses a custom plugin to [publish posts to facebook pages](../facebook-pages-for-wordpress).

## How it's going

The project startet in June 2014 with a idea presentation with the mayor of Grabern. In 2015 the website went online. The last new videos were produced and published in summer 2020.

## Gallery

<!-- <figure>
  <img src="/img/image-640.jpg" alt="Sonnenaufgang mit Nebel" />
  <figcaption>Das ist ein Text der das Bild beschreibt. Was soll ich sonst noch dazu sagen?</figcaption>
</figure>

<hbs>
{{image "/img/image-640.jpg" "Sonnenaufgang mit Nebel"}}
</hbs> -->

<hbs>
{{#gallery43}}
  {{galleryImage '/projects/graberner-geschichten/graberner-geschichten-start-desktop.png' 'Screenshot Graberner GeschichteN Website home page on desktop device'}}
  {{galleryImage '/projects/graberner-geschichten/graberner-geschichten-stories-desktop.png' 'Screenshot Graberner GeschichteN Website stories on desktop device'}}
  {{galleryImage '/projects/graberner-geschichten/graberner-geschichten-news-1-desktop.png' 'Screenshot Graberner GeschichteN Website news on desktop device'}}
  {{galleryImage '/projects/graberner-geschichten/graberner-geschichten-news-2-desktop.png' 'Screenshot Graberner GeschichteN Website news on desktop device'}}
  {{galleryImage '/projects/graberner-geschichten/graberner-geschichten-stories-mobile.png' 'Screenshot Graberner GeschichteN stories on mobile device'}}
  {{galleryImage '/projects/graberner-geschichten/graberner-geschichten-news-mobile.png' 'Screenshot Graberner GeschichteN news on mobile device'}}
{{/gallery43}}
</hbs>

## Credits

<dl class="description-list-simple">
  <dt>Idea, Content Concept, Editorial Management, Interviews </dt>
  <dd>Manuel Köllner</dd>

  <dt>Technical Concept</dt>
  <dd>Bernhard Zeller</dd>

  <dt>Camera</dt>
  <dd>Simon Zauner and Bernhard Zeller</dd>

  <dt>Audio, Editing</dt>
  <dd>Manuel Köllner and Simon Zauner</dd>
  
  <dt>Music</dt>
  <dd>Michael Gutenbrunner</dd>
</dl>

## Links

* [Project website](https://www.grabernergeschichten.at/)
* [Grabern](https://www.gemeinde-grabern.at/)
* [Manuel Köllner](https://www.manuelkoellner.com/)
* [Simon Zauner](https://www.simonzauner.com/)
* [Michael Gutenbrunner](https://soundcloud.com/mgutenbrunner)
