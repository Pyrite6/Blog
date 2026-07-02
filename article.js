const articleRoot = document.querySelector("[data-article-root]");
const articleShared = window.BlogShared;

function renderArticleState(message) {
  if (!articleRoot) {
    return;
  }

  const escape = articleShared?.escapeHtml || String;
  articleRoot.innerHTML = `<p class="empty-state">${escape(message)}</p>`;
}

if (!articleShared) {
  console.error("Shared blog helpers are unavailable.");
  renderArticleState("基础脚本未加载，无法渲染文章。");
} else {
  const {
    loadDataScript,
    escapeHtml,
    sanitizeSegment,
    normalizePath,
    resolveAssetPath,
  } =
    articleShared;

  function loadArticle(category, slug) {
    const safeCategory = sanitizeSegment(category);
    const safeSlug = sanitizeSegment(slug);

    if (!safeCategory || !safeSlug) {
      return Promise.reject(new Error("Invalid article identifier."));
    }

    delete window.__BLOG_ARTICLE__;

    return loadDataScript(
      `data/articles/${safeCategory}/${safeSlug}.js`,
      "__BLOG_ARTICLE__",
      (data) => Boolean(data) && typeof data === "object" && !Array.isArray(data)
    );
  }

  function resolveSourcePath(relativePath, article) {
    return resolveAssetPath(relativePath, article.sourceDir || "");
  }

  function resolveImagePath(relativePath, article) {
    return resolveAssetPath(relativePath, article.imageDir || article.sourceDir || "");
  }

  function resolveMarkdownLink(relativePath, article) {
    const resolvedPath = normalizePath(`${article.sourceDir || ""}/${relativePath}`);
    const match = resolvedPath.match(/^posts\/([^/]+)\/([^/]+)\.md$/i);

    if (!match) {
      return resolveSourcePath(relativePath, article);
    }

    const [, category, slug] = match;
    return `article.html?category=${encodeURIComponent(
      category
    )}&slug=${encodeURIComponent(slug)}`;
  }

  function renderInlineMarkdown(text, article) {
    let html = escapeHtml(text);

    html = html.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt, src) =>
        `<img src="${escapeHtml(
          resolveImagePath(src.trim(), article)
        )}" alt="${escapeHtml(alt.trim())}" />`
    );

    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, href) =>
        `<a href="${escapeHtml(
          href.trim().endsWith(".md")
            ? resolveMarkdownLink(href.trim(), article)
            : resolveSourcePath(href.trim(), article)
        )}">${escapeHtml(label.trim())}</a>`
    );

    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

    return html;
  }

  function renderMarkdown(markdown, article) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraphLines = [];
    let listItems = [];
    let listType = "";
    let blockquoteLines = [];
    let inCodeBlock = false;
    let codeFenceLanguage = "";
    let codeLines = [];

    const flushParagraph = () => {
      if (paragraphLines.length === 0) {
        return;
      }

      html.push(
        `<p>${renderInlineMarkdown(paragraphLines.join(" ").trim(), article)}</p>`
      );
      paragraphLines = [];
    };

    const flushList = () => {
      if (listItems.length === 0 || !listType) {
        return;
      }

      html.push(
        `<${listType}>${listItems
          .map((item) => `<li>${renderInlineMarkdown(item, article)}</li>`)
          .join("")}</${listType}>`
      );
      listItems = [];
      listType = "";
    };

    const flushBlockquote = () => {
      if (blockquoteLines.length === 0) {
        return;
      }

      html.push(
        `<blockquote>${renderMarkdown(blockquoteLines.join("\n"), article)}</blockquote>`
      );
      blockquoteLines = [];
    };

    const flushCodeBlock = () => {
      if (codeLines.length === 0 && !inCodeBlock) {
        return;
      }

      const languageClass = codeFenceLanguage
        ? ` class="language-${escapeHtml(codeFenceLanguage)}"`
        : "";
      html.push(
        `<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`
      );
      codeLines = [];
      codeFenceLanguage = "";
      inCodeBlock = false;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (inCodeBlock) {
        if (/^```/.test(trimmed)) {
          flushCodeBlock();
          return;
        }

        codeLines.push(line);
        return;
      }

      if (/^```/.test(trimmed)) {
        flushParagraph();
        flushList();
        flushBlockquote();
        inCodeBlock = true;
        codeFenceLanguage = trimmed.slice(3).trim().split(/\s+/)[0] || "";
        return;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        flushBlockquote();
        return;
      }

      if (blockquoteLines.length > 0 && !/^>/.test(trimmed)) {
        flushBlockquote();
      }

      if (/^>\s?/.test(trimmed)) {
        flushParagraph();
        flushList();
        blockquoteLines.push(trimmed.replace(/^>\s?/, ""));
        return;
      }

      if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
        flushParagraph();
        flushList();
        html.push("<hr />");
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        html.push(
          `<h${level}>${renderInlineMarkdown(headingMatch[2].trim(), article)}</h${level}>`
        );
        return;
      }

      const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
      if (unorderedMatch) {
        flushParagraph();
        if (listType && listType !== "ul") {
          flushList();
        }
        listType = "ul";
        listItems.push(unorderedMatch[1].trim());
        return;
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        if (listType && listType !== "ol") {
          flushList();
        }
        listType = "ol";
        listItems.push(orderedMatch[1].trim());
        return;
      }

      if (/^!\[([^\]]*)\]\(([^)]+)\)\s*$/.test(trimmed)) {
        flushParagraph();
        flushList();
        html.push(renderInlineMarkdown(trimmed, article));
        return;
      }

      paragraphLines.push(trimmed);
    });

    if (blockquoteLines.length > 0) {
      flushBlockquote();
    }

    if (listItems.length > 0) {
      flushList();
    }

    if (paragraphLines.length > 0) {
      flushParagraph();
    }

    if (inCodeBlock) {
      flushCodeBlock();
    }

    return html.join("\n");
  }

  function updateArticleMeta(article) {
    document.title = `${article.title} | 五六七`;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        article.description || article.excerpt || article.summary || article.title
      );
    }
  }

  function renderArticle(article) {
    if (!articleRoot) {
      return;
    }

    updateArticleMeta(article);

    const metaItems = [
      article.dateLabel || article.date,
      article.wordCount,
      article.readingTime,
    ].filter(Boolean);

    const tagsHtml =
      Array.isArray(article.tags) && article.tags.length > 0
        ? `
            <div class="article-tags" aria-label="文章标签">
              ${article.tags
                .map((tag) => `<span class="article-tag">${escapeHtml(tag)}</span>`)
                .join("")}
            </div>
          `
        : "";

    const coverHtml = article.cover
      ? `<img class="article-detail-cover" src="${escapeHtml(
          resolveImagePath(article.cover, article)
        )}" alt="${escapeHtml(article.title)}封面" />`
      : "";

    articleRoot.innerHTML = `
      <p class="archive-kicker">${escapeHtml(article.category || article.folder || "未分类")}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-detail-meta">
        ${metaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      ${tagsHtml}
      ${coverHtml}
      <div class="article-detail-body">${renderMarkdown(article.content || "", article)}</div>
    `;
  }

  function mountArticlePage() {
    const pageUrl = new URL(window.location.href);
    const category = pageUrl.searchParams.get("category");
    const slug = pageUrl.searchParams.get("slug");

    if (!category || !slug) {
      renderArticleState("缺少文章参数，无法加载内容。");
      return;
    }

    loadArticle(category, slug)
      .then((article) => {
        renderArticle(article);
      })
      .catch((error) => {
        console.error(error);
        renderArticleState("文章加载失败，请确认数据已经重新生成。");
      });
  }

  if (document.body.dataset.page === "article") {
    mountArticlePage();
  }
}
