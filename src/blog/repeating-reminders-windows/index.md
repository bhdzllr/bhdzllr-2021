---
id: repeating-reminders-windows
title: Repeating Screen Break Reminders in Windows
tagline: In Windows there is the application Task Scheduler that can run programs or scripts at certain times and also repetitive.
date: 2022-11-23
imageSocialGeneric: true
categories:
  - Tech
tags:
  - reminders
  - windows
  - ScreenBreak
---

To remind myself of screen breaks I created a script that prints a message on the screen.
 
Before the task can be created a script is needed.
A file "screen-break.vbs" with the following content is created and saved.
 
```vbs
Dim ObjShell
Set ObjShell = CreateObject("WScript.Shell")
ObjShell.Popup "A screen break of at least five minutes is required. NOW!", 0, "Screen break required", 48 + 4096
```
 
The first parameter of the Popup is the text, the second defines how long the popup is visible on the screen (zero is the default and means that the box remains on the screen until the user closes it), the third is the title and the last defines the buttons and icon of the Popup. I have just a button "OK" (value "0") with icon "Exclamation Mark" (value "48"). The value "4096" makes the popup a system modal to keep it on top of all other windows.
 
Then open the Task Scheduler. To find it click on Windows Start Button and type "task scheduler".
 
* Select "Action" - "Create Task..."
* Enter a name and a description
* Tab "Trigger" - Button "New..."
* Set schedule, e.g. Daily, Start 07:00, Recur every "1" days, Recur every hour
* Tab "Action"  - Button "New..."
* Select your saved script in field "Program/script" with Button "Browse..."
 
That's it.

<hbs>
  <figure>
    {{image "/blog/repeating-reminders-windows/screen-break-windows-popup.png" "Screenshot of a Windows popup with a yellow exclamation mark icon that prints: A screen break of at least five minutes is required. NOW!"}}
    <figcaption>Popup example</figcaption>
  </figure>
</hbs>
 
At first it helped me to make breaks, but unfortunately I have to say that after a while I simply clicked the messages away automatically, especially when I was in the flow of working.
 
I was wondering if something like this is also possible on macOS with Apple Script and found an [entry on Stack Overflow](https://stackoverflow.com/a/3718673/6458288). Since macOS is a Unix-like OS, this should also be possible in the terminal with a shell script and "crontab".
