---
id: quick-logging
title: Quick Logging
tagline: Build web apps for quick data logging. Web apps for simple data input. Use the data as CSV in your spreadsheet program of choice.
date: 2020-11-17
image: /projects/quick-logging/quick-logging-website.jpg
imageAlt: 'Screenshot of the home page of quicklogging.com with text: Build web apps for quick data logging. Web apps for simple data input. Use the data as CSV in your spreadsheet program of choice.'
year: 2020
# action: https://www.quicklogging.com/
categories:
  - Web Development
  - Side Projects
tags:
  - web
  - development
  - saas
  - data
  - logging
---

## Idea

Why did I built Quick Logging? 

* When my girlfriend and I wanted to track our expenses, I built a small web app, where we could select our names, an amount a company and category for our expenses. The data was saved into a CSV which we further used in a spreadsheet application to create diagrams and filter data.
* When we planned a big party for my friends with 50 - 60 guests I built a small web app for registration to check how many people will come, which food and sport they like. Everything as CSV to later use it in a spreadsheet program.

These two web apps followed the same pattern. They used simple forms to get data that I later used in another application. So the idea behind Quick Logging was to simplify the process of creating such web apps.

With Quick Logging it's possible to build form based web apps for data input. All the data is saved and can be downloaded as a CSV for use in your other applications.

Different fields can be used and access can be restricted to the web app with a URL based.

The created web apps can have a custom icon and can be added to the home screen on iPhone or Android devices.

## Implementation

The application is built with PHP and uses a SQLite database. Stripe is used for the payment process.

## How it's going

I posted the project on Product Hunt and Hacker News without getting traction from those sites. Otherwise I did not advertise the project. A few people have tried the application, but no one uses it consistently.

Quick Logging uses four pricing models:

* Free: Unlimited apps with a maximum of five fields
* Single ($3/month): Unlimited apps, one with unlimited fields
* Basic ($7/month): Unlimited apps, five with unlimited fields
* Pro ($15/month): Unlimited apps with unlimited fields

### Closure

The project was ended at the end of 2023 and will not be continued.


## Gallery

{{#gallery}}
  {{galleryImage '/projects/quick-logging/quick-logging-website.jpg' 'Screenshot of the home page of quicklogging.com with text: Build web apps for quick data logging. Web apps for simple data input. Use the data as CSV in your spreadsheet program of choice.'}}
  {{galleryImage '/projects/quick-logging/quick-logging-app-create.jpg' 'Screenshot shows the form to create an application with fields name, identifier, access key, email and icon'}}
  {{galleryImage '/projects/quick-logging/quick-logging-app-fields.jpg' 'Screenshot shows the user interface for adding new fields to an web app. A date field is already visible and a button "Add field" and "Create app" is visible.'}}
  {{galleryImage '/projects/quick-logging/quick-logging-app-example.jpg' 'iPhone mockup that shows a simple web app with a date field and a button "Log".'}}
  {{galleryImage '/projects/quick-logging/quick-logging-apps.jpg' 'Admin interface on quicklogging.com to manage own apps. The site shows information about the current subscription, which is "Single" and about two already created apps with buttons to edit or view it and to download the data. There is also a button "Deactivate" on the first app to disable unlimited fields.'}}
{{/gallery}}
