---
id: magnolia-cms-rest-asset
title: Magnolia CMS Asset via REST
tagline: Creating Assets in Magnolia CMS via REST and Nodes API.
date: 2023-01-21
image: /blog/magnolia-cms-rest-asset/magnolia-cms-rest-asset.jpg
imageAlt: Screenshot of some lines of the cURL command from the code snippet in the article.
imageSocial: /blog/magnolia-cms-rest-asset/magnolia-cms-rest-asset.jpg
categories:
  - Web Development
tags:
  - magnolia
  - CMS
  - REST
  - nodes
  - API
  - asset
  - resource
  - dam
---

This is an example on how to create an asset in Magnolia CMS DAM workspace.
To create an asset, two requests are necessary:

* First Request: Create asset node with type `mgnl:asset`
* Second Request: Create a subnode with type `mgnl:resource`

## Create Asset

The request contains the node with minimum three properties: type, name and title.

```Bash
curl --request PUT \
  --url http://localhost:8080/.rest/nodes/v1/dam/path/to/parent \
  --header 'Accept: application/json' \
  --header 'Authorization: Basic SECRET' \
  --header 'Content-Type: application/json' \
  --data '{
  "name": "hello",
  "type": "mgnl:asset",
  "path": "/path/to/parent/hello",
  "properties": [
    {
      "name": "type",
      "type": "String",
      "multiple": false,
      "values": [
        "txt"
      ]
    },
    {
      "name": "name",
      "type": "String",
      "multiple": false,
      "values": [
        "hello"
      ]
    },
    {
      "name": "title",
      "type": "String",
      "multiple": false,
      "values": [
        "Hello Worlds TXT"
      ]
    }
  ]
}'
```

## Create Resource for Asset

The second request contains the subnode with five properties: jcr:data ([binary in base64 format](/blog/image-to-base64/)), extension, fileName, jcr:mimeType and size (in bytes).
Now, the node should already be present in the Assets app.

The [Magnolia CMS 5.7 documentation](https://documentation.magnolia-cms.com/display/DOCS57/How+to+add+an+asset+with+REST) does not mention that the size is necessary, bu the size is important otherwise the asset will not work.
The [documentation for Magnolia CMS 6](https://docs.magnolia-cms.com/product-docs/6.2/Developing/Development-how-tos/How-to-add-an-asset-with-REST.html) has the size in the request example.

To find the size of a file the command `stat` can be used, e.g.: `stat --printf="%s" hello.txt` or on macOS `stat -f%z hello.txt`.

```bash
curl --request PUT \
  --url http://localhost:8080/.rest/nodes/v1/dam/path/to/parent/hello \
  --header 'Accept: application/json' \
  --header 'Authorization: Basic SECRET' \
  --header 'Content-Type: application/json' \
  --data '{
  "name": "jcr:content",
  "type": "mgnl:resource",
  "path": "/path/to/parent/hello/jcr:content",
  "properties": [
    {
      "name": "jcr:data",
      "type": "Binary",
      "multiple": false,
      "values": [
        "SGVsbG8sIFdvcmxkcyE="
      ]
    },
    {
      "name": "extension",
      "type": "String",
      "multiple": false,
      "values": [
        "txt"
      ]
    },
    {
      "name": "fileName",
      "type": "String",
      "multiple": false,
      "values": [
        "hello.txt"
      ]
    },
    {
      "name": "jcr:mimeType",
      "type": "String",
      "multiple": false,
      "values": [
        "plain/text"
      ]
    },
    {
      "name": "size",
      "type": "Long",
      "multiple": false,
      "values": [
        14
      ]
    }
  ]
}'
```

Now the resource with the binary data is created and the asset should work.
