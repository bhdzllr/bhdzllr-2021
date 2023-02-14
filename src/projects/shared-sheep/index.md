---
id: shared-sheep
title: Shared Sheep
tagline: Get sponsorship for a merino sheep. Get merino wool products from your sheep.
date: 2019-01-06
image: /projects/shared-sheep/shared-sheep-website.jpg
imageAlt: 'Screenshot of the home page of sharedsheep.com with text: Welcome at Shared Sheep'
year: 2019
action: https://www.sharedsheep.com/
categories:
  - Side Projects
  - Freelance
tags:
  - web
  - development
  - SharedSheep
  - 2m2m
---

## Idea

Shared Sheep customers receive merino wool products from their own sponsored sheep. Customers can either sign up for a sponsorship or rent sheep themselves.

The project was [an idea of Jakob and Thomas](https://www.sharedsheep.com/impressum/) and they asked me to implement the website including an online shop as well as the sponsorship and rent subscription process.

They also presented their project at the Austrian startup shop "2 Minuten 2 Millionen" with good feedback and investors. The show aired in March 2019.


## Implementation

The website is built with HTML, CSS and JavaScript and a little bit of PHP on the server to handle subscriptions and payment. I used handlebars as template engine and to statically generate all pages. Gulp is used as a task runner to build and deploy the website. Stripe is used to process payments.

The biggest challenge was to make the server stable for the date of the show because a high load was expected. This was also a reason why I decided to make as much content static as possible and tried to reduce the requests per page.
I also did load tests with ApacheBench (ab), Apache JMeter and Siege.

On the day of the show I scaled the server (DigitalOcean Droplet) to 16 GB RAM and 6 vCPUs. The peak were 1250 users online per minute. The server was able to handle the load with ease.

Later we replaced the custom online shop with a external shop system from Wix.


## How it's going

The project is still running.


## Gallery

{{#gallery43}}
  {{galleryImage '/projects/shared-sheep/shared-sheep-website.jpg' 'Screenshot of the home page of sharedsheep.com with text: Welcome at Shared Sheep'}}
  {{galleryImage '/projects/shared-sheep/shared-sheep-wool-hat-and-loop.jpg' 'A merino wool hat and loop in different shades of green.'}}
{{/gallery43}}
