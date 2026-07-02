(() => {
  const pageShell = document.querySelector(".page-shell");

  if (!pageShell) {
    return;
  }

  const headerScriptUrl = new URL(
    document.currentScript?.getAttribute("src") || "header.js",
    window.location.href
  );
  const fromHeader = (path) => new URL(path, headerScriptUrl).href;
  const faviconUrl = fromHeader("blog.ico");

  function mountFavicon() {
    const existingIcon = document.head.querySelector('link[rel~="icon"]');
    const icon = existingIcon || document.createElement("link");

    icon.rel = "icon";
    icon.type = "image/jpeg";
    icon.href = faviconUrl;

    if (!existingIcon) {
      document.head.append(icon);
    }
  }

  mountFavicon();

  const template = document.createElement("template");
  template.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${fromHeader("index.html")}" aria-label="五六七首页">
        <img
          class="brand-avatar"
          src="${fromHeader("assets/avatar.jpg")}"
          alt=""
          aria-hidden="true"
        />
        <span class="brand-text">五六七</span>
      </a>
      <nav class="main-nav" aria-label="主导航">
        <a data-nav="home" href="${fromHeader("index.html")}">首页</a>
        <a data-nav="works" href="${fromHeader("works.html")}">作品</a>
        <a data-nav="shelf" href="${fromHeader("shelf.html")}">书架</a>
        <a data-nav="fragments" href="${fromHeader("fragments.html")}">碎片</a>
        <a data-nav="about" href="${fromHeader("about.html")}">关于我</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button" type="button" aria-label="搜索">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.75"></circle>
            <path d="M16.2 16.2 20 20"></path>
          </svg>
        </button>
        <button
          class="icon-button theme-toggle"
          type="button"
          aria-label="切换主题"
        >
          <svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2"></circle>
            <path d="M12 1.5v3"></path>
            <path d="M12 19.5v3"></path>
            <path d="M4.6 4.6 6.7 6.7"></path>
            <path d="M17.3 17.3 19.4 19.4"></path>
            <path d="M1.5 12h3"></path>
            <path d="M19.5 12h3"></path>
            <path d="M4.6 19.4 6.7 17.3"></path>
            <path d="M17.3 6.7 19.4 4.6"></path>
          </svg>
        </button>
      </div>
    </header>
  `.trim();

  const nextHeader = template.content.firstElementChild;

  if (!nextHeader) {
    return;
  }

  const headerMount = pageShell.querySelector("[data-shared-header]");
  const currentHeader = pageShell.querySelector(".site-header");

  if (headerMount) {
    headerMount.replaceWith(nextHeader);
    return;
  }

  if (currentHeader) {
    currentHeader.replaceWith(nextHeader);
    return;
  }

  pageShell.prepend(nextHeader);
})();
