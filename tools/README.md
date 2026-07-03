# Post Tools

## Build Once

```powershell
py tools\build_posts.py
```

## Watch Markdown Changes

```powershell
py tools\watch_posts.py
```

or double-click:

```text
tools\start_post_watch.bat
```

The watcher monitors `posts/**/*.md` and rebuilds `data/` automatically whenever a Markdown file is added, edited, or removed.

## Article Images

For an article at:

```text
posts/default/blog-intro.md
```

put its images under:

```text
image/default/blog-intro/
```

Then in the Markdown body you can reference them directly, for example:

```md
![示例图片](cover.png)
![流程图](gallery/step-1.jpg)
```

Those paths will automatically resolve to:

```text
image/default/blog-intro/cover.png
image/default/blog-intro/gallery/step-1.jpg
```

## Fragments

Fragments live in:

```text
posts/fragments/fragments.md
```

Use level-2 date headings for each fragment:

```md
## 2026-06-01 17:54:24

碎片正文第一段。

碎片正文第二段。

![图片说明](photo.jpg)
```

Fragment images are stored by year:

```text
image/Fragment/2026/photo.jpg
```

Running the build script writes:

```text
data/fragments.json
data/fragments.js
```
