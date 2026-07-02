const root = document.body;
const scriptUrl = new URL(
  document.currentScript?.getAttribute("src") || "script.js",
  window.location.href
);

const savedTheme = window.localStorage.getItem("blog-theme");
if (savedTheme === "dark") {
  root.dataset.theme = "dark";
}

function loadDataScript(relativePath, globalName, isValid) {
  const validator = isValid || (() => true);
  if (validator(window[globalName])) {
    return Promise.resolve(window[globalName]);
  }

  return new Promise((resolve, reject) => {
    const dataScript = document.createElement("script");
    const dataUrl = new URL(relativePath, scriptUrl);
    dataUrl.searchParams.set("v", Date.now().toString());
    dataScript.src = dataUrl.href;
    dataScript.async = false;
    dataScript.onload = () => {
      const data = window[globalName];
      if (!validator(data)) {
        reject(new Error(`Missing data payload: ${globalName}`));
        return;
      }
      resolve(data);
    };
    dataScript.onerror = () => {
      reject(new Error(`Failed to load data script: ${relativePath}`));
    };
    document.head.append(dataScript);
  });
}

function loadPosts() {
  return loadDataScript(
    "data/posts.js",
    "__BLOG_POSTS__",
    (data) => Array.isArray(data)
  );
}

function loadCategories() {
  return loadDataScript(
    "data/categories.js",
    "__BLOG_CATEGORIES__",
    (data) => Array.isArray(data)
  );
}

function loadSharedHeader() {
  return new Promise((resolve, reject) => {
    const headerScript = document.createElement("script");
    headerScript.src = new URL("header.js", scriptUrl).href;
    headerScript.async = false;
    headerScript.onload = resolve;
    headerScript.onerror = () => {
      reject(new Error("Failed to load shared header."));
    };
    document.head.append(headerScript);
  });
}

function loadSharedFooter() {
  return new Promise((resolve, reject) => {
    const footerScript = document.createElement("script");
    footerScript.src = new URL("footer.js", scriptUrl).href;
    footerScript.async = false;
    footerScript.onload = resolve;
    footerScript.onerror = () => {
      reject(new Error("Failed to load shared footer."));
    };
    document.head.append(footerScript);
  });
}

function initSharedHeader() {
  const toggle = document.querySelector(".theme-toggle");
  const navLinks = document.querySelectorAll("[data-nav]");

  toggle?.addEventListener("click", () => {
    const isDark = root.dataset.theme === "dark";

    if (isDark) {
      delete root.dataset.theme;
      window.localStorage.setItem("blog-theme", "light");
      return;
    }

    root.dataset.theme = "dark";
    window.localStorage.setItem("blog-theme", "dark");
  });

  const currentPage =
    root.dataset.page === "article" ? "home" : root.dataset.page;
  navLinks.forEach((link) => {
    const isActive = link.dataset.nav === currentPage;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeSegment(value) {
  return String(value || "").trim().replace(/[^a-z0-9_-]/gi, "");
}

function normalizePath(path) {
  const segments = [];

  path
    .replaceAll("\\", "/")
    .split("/")
    .forEach((segment) => {
      if (!segment || segment === ".") {
        return;
      }

      if (segment === "..") {
        segments.pop();
        return;
      }

      segments.push(segment);
    });

  return segments.join("/");
}

function isSpecialUrl(url) {
  return /^(?:[a-z]+:|\/|#)/i.test(url);
}

function resolveAssetPath(relativePath, baseDir) {
  if (!relativePath) {
    return "";
  }

  if (isSpecialUrl(relativePath)) {
    return relativePath;
  }

  if (/^(?:assets|data|posts|image)\//i.test(relativePath)) {
    return normalizePath(relativePath);
  }

  if (/^[a-z0-9_-]+\.html(?:[?#].*)?$/i.test(relativePath)) {
    return relativePath;
  }

  return normalizePath(`${baseDir || ""}/${relativePath}`);
}

window.BlogShared = {
  loadDataScript,
  escapeHtml,
  sanitizeSegment,
  normalizePath,
  isSpecialUrl,
  resolveAssetPath,
};

function resolvePostCoverPath(post) {
  return resolveAssetPath(post.cover, post.imageDir || post.sourceDir || "");
}

function getPostFolder(post) {
  return post.folder || "";
}

function normalizeCategories(categories, posts) {
  const countsByFolder = posts.reduce((acc, post) => {
    const folder = getPostFolder(post);
    if (!folder) {
      return acc;
    }

    acc[folder] = (acc[folder] || 0) + 1;
    return acc;
  }, {});

  const seen = new Set();
  const normalized = categories.map((category) => {
    seen.add(category.folder);
    return {
      ...category,
      count: countsByFolder[category.folder] || 0,
    };
  });

  posts.forEach((post) => {
    const folder = getPostFolder(post);
    if (!folder || seen.has(folder)) {
      return;
    }

    seen.add(folder);
    normalized.push({
      id: folder,
      name: post.category || folder,
      folder,
      count: countsByFolder[folder] || 0,
      order: Number.isFinite(post.categoryOrder) ? post.categoryOrder : 999,
    });
  });

  return normalized.sort((a, b) => {
    const orderA = Number.isFinite(a.order) ? a.order : 999;
    const orderB = Number.isFinite(b.order) ? b.order : 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
}

function getAllTags(posts) {
  return [...new Set(posts.flatMap((post) => post.tags || []))].sort((a, b) =>
    a.localeCompare(b, "zh-CN")
  );
}

function filterPosts(posts, selectedCategory, selectedTags) {
  return posts.filter((post) => {
    const matchesCategory =
      selectedCategory === "all" || getPostFolder(post) === selectedCategory;
    const matchesTag =
      selectedTags.size === 0 ||
      [...selectedTags].every((tag) => (post.tags || []).includes(tag));
    return matchesCategory && matchesTag;
  });
}

function sortPostsByDate(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function sortRecentPosts(posts) {
  return [...posts]
    .filter((post) => post.showInRecent !== false)
    .sort((a, b) => {
      const orderA = Number.isFinite(a.recentOrder) ? a.recentOrder : 999;
      const orderB = Number.isFinite(b.recentOrder) ? b.recentOrder : 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(b.date) - new Date(a.date);
    });
}

function sortArchivePosts(posts) {
  return [...posts]
    .filter((post) => post.showInArchive !== false)
    .sort((a, b) => {
      const orderA = Number.isFinite(a.archiveOrder) ? a.archiveOrder : 999;
      const orderB = Number.isFinite(b.archiveOrder) ? b.archiveOrder : 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.date) - new Date(a.date);
    });
}

function renderPostGrid(posts) {
  const postGrid = document.querySelector("[data-post-grid]");
  if (!postGrid) {
    return;
  }

  if (posts.length === 0) {
    postGrid.innerHTML = '<p class="empty-state">当前筛选条件下还没有文章。</p>';
    return;
  }

  postGrid.innerHTML = posts
    .slice(0, 3)
    .map(
      (post, index) => `
        <article class="post-card ${index === 0 ? "post-card-featured" : ""}">
          <a class="post-thumb" href="${escapeHtml(post.path)}">
            <img src="${escapeHtml(resolvePostCoverPath(post))}" alt="${escapeHtml(post.title)}封面" />
          </a>
          <p class="post-category">${escapeHtml(post.category)}</p>
          <h3><a href="${escapeHtml(post.path)}">${escapeHtml(post.title)}</a></h3>
          <p class="post-excerpt">${escapeHtml(post.summary)}</p>
        </article>
      `
    )
    .join("");
}

function renderArchive(posts, selectedTags) {
  const archiveList = document.querySelector("[data-archive-list]");
  if (!archiveList) {
    return;
  }

  if (posts.length === 0) {
    archiveList.innerHTML = '<p class="empty-state">当前筛选条件下还没有文章。</p>';
    return;
  }

  archiveList.innerHTML = posts
    .map(
      (post) => `
        <article class="archive-card ${post.featured ? "archive-card-featured" : ""}">
          <div class="archive-card-head">
            <h3><a href="${escapeHtml(post.path)}">${escapeHtml(post.title)}</a></h3>
            ${post.pinned ? '<span class="archive-mark">★</span>' : ""}
          </div>
          <div class="archive-meta">
            <span>${escapeHtml(post.dateLabel)}</span>
            <span>${escapeHtml(post.category)}</span>
          </div>
          <div class="archive-tags">
            ${(post.tags || [])
              .map(
                (tag) =>
                  `<button class="archive-tag ${
                    selectedTags.has(tag) ? "is-active" : ""
                  }" type="button" data-tag-filter="${escapeHtml(
                    tag
                  )}" aria-pressed="${selectedTags.has(tag) ? "true" : "false"}">${escapeHtml(tag)}</button>`
              )
              .join("")}
          </div>
          <p class="archive-summary">${escapeHtml(post.excerpt)}</p>
          <p class="archive-stats">${escapeHtml(post.wordCount)} · ${escapeHtml(post.readingTime)}</p>
        </article>
      `
    )
    .join("");
}

function renderCategories(categories, posts, selectedCategory) {
  const categoryList = document.querySelector("[data-category-list]");
  if (!categoryList) {
    return;
  }

  const totalCount = posts.length;
  const items = [
    {
      id: "all",
      name: "全部",
      count: totalCount,
    },
    ...categories.map((category) => ({
      id: category.folder,
      name: category.name,
      count: category.count,
    })),
  ];

  categoryList.innerHTML = items
    .map(
      (item) => `
        <button
          class="taxonomy-item ${selectedCategory === item.id ? "is-active" : ""}"
          type="button"
          data-category-filter="${escapeHtml(item.id)}"
        >
          <span>${escapeHtml(item.name)}</span>
          <strong>${escapeHtml(item.count)}</strong>
        </button>
      `
    )
    .join("");
}

function renderTags(tags, posts, selectedTags) {
  const tagList = document.querySelector("[data-tag-list]");
  if (!tagList) {
    return;
  }

  const tagCounts = posts.reduce((acc, post) => {
    (post.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  tagList.innerHTML = tags
    .map(
      (tag) => `
        <button
          class="tag-chip ${selectedTags.has(tag) ? "is-active" : ""}"
          type="button"
          data-tag-filter="${escapeHtml(tag)}"
          aria-pressed="${selectedTags.has(tag) ? "true" : "false"}"
        >
          ${escapeHtml(tag)}
          <span>${escapeHtml(tagCounts[tag] || 0)}</span>
        </button>
      `
    )
    .join("");
}

function updateProfileStats(posts, tags) {
  const stats = document.querySelectorAll(".profile-stats span");
  if (stats.length < 2) {
    return;
  }

  stats[0].textContent = `${posts.length} 篇文章`;
  stats[1].textContent = `${tags.length} 个标签`;
}

function mountHomeFilters(posts, categories) {
  let selectedCategory = "all";
  const selectedTags = new Set();
  const allTags = getAllTags(posts);
  const normalizedCategories = normalizeCategories(categories, posts);

  updateProfileStats(posts, allTags);

  const refresh = () => {
    const filteredPosts = filterPosts(posts, selectedCategory, selectedTags);
    const recentPosts = sortRecentPosts(filteredPosts);
    const archivePosts = sortArchivePosts(filteredPosts);

    renderCategories(normalizedCategories, posts, selectedCategory);
    renderTags(allTags, posts, selectedTags);
    renderPostGrid(
      recentPosts.length > 0 ? recentPosts : sortPostsByDate(filteredPosts)
    );
    renderArchive(archivePosts, selectedTags);
  };

  document.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category-filter]");
    if (categoryButton) {
      selectedCategory = categoryButton.dataset.categoryFilter || "all";
      refresh();
      return;
    }

    const tagButton = event.target.closest("[data-tag-filter]");
    if (tagButton) {
      const nextTag = tagButton.dataset.tagFilter || "";
      if (!nextTag) {
        return;
      }

      if (selectedTags.has(nextTag)) {
        selectedTags.delete(nextTag);
      } else {
        selectedTags.add(nextTag);
      }

      refresh();
    }
  });

  refresh();
}

loadSharedHeader()
  .then(initSharedHeader)
  .catch((error) => {
    console.error(error);
    initSharedHeader();
  });

loadSharedFooter().catch((error) => {
  console.error(error);
});

if (root.dataset.page === "home") {
  Promise.all([loadPosts(), loadCategories()])
    .then(([posts, categories]) => {
      mountHomeFilters(posts, categories);
    })
    .catch((error) => {
      console.error(error);
    });
}
