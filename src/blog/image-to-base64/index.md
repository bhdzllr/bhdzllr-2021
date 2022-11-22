---
id: image-to-base64
title: Convert image to base64 in terminal
tagline: "With the command line tool 'base64' it is possible to convert images to base64 strings."
date: 2022-11-22
imageSocialGeneric: true
categories:
  - Tech
tags:
  - base64
  - cli
---

The following command converts a file to base64 and writes the result to a text file and removes all newlines (parameter "-w 0").

```bash
base64 /path/to/file > /path/to/out.txt -w 0
```

If a file contains the base64 string, let's assume from a PDF file, the following command prints and decodes it into a PDF file.

```shell
cat test.txt | base64 --decode > test.pdf
```

It's also possible to encode or decode a string directly in the terminal and print the result using the pipe operator:

```shell
echo "Hello, Worlds!" | base64
# Output: SGVsbG8sIFdvcmxkcyEK

echo "SGVsbG8sIFdvcmxkcyEK" | base64 --decode
# Output: Hello, Worlds!
```

That's all Folks!
