/* ============================================
   Works Page — Image to Content transition
   Pure vanilla JS — no GSAP / Lenis dependency
   ============================================ */
(function () {
  var BlogShared = window.BlogShared;
  if (!BlogShared) return;

  /* ---- constants ---- */
  var FLIP_DURATION = 800;          // ms — flip animation
  var FLIP_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";
  var TEXT_DURATION = 500;          // ms — text fade/slide
  var TEXT_DELAY = 150;             // ms — stagger after flip starts
  var PARALLAX_SCALE = 0.8;         // max extra scaleY (1 → 1.8)

  /* ---- DOM refs ---- */
  var previewWrap = document.querySelector("[data-preview-wrap]");
  var contentWrap = document.querySelector("[data-content-wrap]");
  var backCtrl = document.querySelector(".action--back");
  if (!previewWrap || !contentWrap || !backCtrl) return;

  /* ---- state ---- */
  var previewItems = [];            // PreviewItem[]
  var currentItem = -1;             // index of open item
  var isAnimating = false;
  var flyingImage = null;           // clone element during flip
  var scrollTicking = false;

  /* ---- placeholder images ---- */
  var PLACEHOLDER_IMAGES = [
    "assets/1.jpg", "assets/2.jpg", "assets/3.jpg",
    "assets/4.jpg", "assets/5.jpg", "assets/6.jpg", "assets/7.jpg"
  ];

  /* ================================================================
     Helpers
     ================================================================ */

  function escapeHtml(str) {
    return BlogShared.escapeHtml
      ? BlogShared.escapeHtml(str)
      : String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function resolveCover(post) {
    if (!post.cover) return "";
    if (BlogShared.resolveAssetPath) return BlogShared.resolveAssetPath(post.cover, post.imageDir || "");
    return post.cover;
  }

  /* transition-end helper with timeout fallback */
  function onTransitionEnd(el, callback) {
    var called = false;
    function handler(e) {
      if (e.target !== el) return;
      if (called) return;
      called = true;
      el.removeEventListener("transitionend", handler);
      callback();
    }
    el.addEventListener("transitionend", handler);
    setTimeout(function () {
      if (!called) { called = true; el.removeEventListener("transitionend", handler); callback(); }
    }, FLIP_DURATION + 120);
  }

  /* ================================================================
     Data loading
     ================================================================ */

  function loadWorksData() {
    return BlogShared.loadDataScript("data/posts.js", "__BLOG_POSTS__", function (d) {
      return Array.isArray(d);
    }).then(function (posts) {
      var works = posts.filter(function (p) {
        return (p.folder || "").toLowerCase() === "works";
      });
      return padWorks(works);
    });
  }

  function padWorks(works) {
    var padded = works.slice();
    var imgIdx = 0;
    while (padded.length < 6) {
      padded.push({
        id: "placeholder-" + padded.length,
        title: "作品 " + (padded.length + 1),
        excerpt: "更多作品即将上线，敬请期待。",
        summary: "更多作品即将上线，敬请期待。",
        tags: [],
        cover: PLACEHOLDER_IMAGES[imgIdx % PLACEHOLDER_IMAGES.length],
        path: "",
        isPlaceholder: true
      });
      imgIdx++;
    }
    return padded;
  }

  /* ================================================================
     DOM building
     ================================================================ */

  function buildPreviews(works) {
    previewWrap.innerHTML = works.map(function (w, i) {
      var cover = resolveCover(w);
      return (
        '<div class="preview" data-index="' + i + '">' +
          '<div class="preview__img-wrap">' +
            '<div class="preview__img">' +
              '<div class="preview__img-inner" style="background-image:url(' + escapeHtml(cover) + ')"></div>' +
            '</div>' +
          '</div>' +
          '<div class="preview__title">' +
            '<h2 class="preview__title-main">' +
              '<span class="oh"><span class="oh__inner">' + escapeHtml(w.title) + '</span></span>' +
            '</h2>' +
            '<p class="preview__desc">' + escapeHtml(w.excerpt || w.summary || "") + '</p>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function buildContents(works) {
    contentWrap.innerHTML = works.map(function (w, i) {
      var cover = resolveCover(w);
      var tagsHtml = "";
      if (w.tags && w.tags.length) {
        tagsHtml = '<div class="content__meta oh"><span class="oh__inner">' +
          w.tags.map(function (t) { return escapeHtml(t); }).join("  ·  ") +
          '</span></div>';
      }
      var linkHtml = "";
      if (w.path && !w.isPlaceholder) {
        linkHtml = '<a class="content__link" href="' + escapeHtml(w.path) + '">查看详情</a>';
      }
      var thumbsHtml = "";
      if (!w.isPlaceholder && w.imageDir) {
        thumbsHtml = '<div class="content__thumbs">' +
          [1, 2, 3, 4].map(function () { return '<div class="content__thumbs-item"></div>'; }).join("") +
          '</div>';
      }
      return (
        '<div class="content" data-index="' + i + '">' +
          '<div class="content__img">' +
            '<div class="preview__img-inner" style="background-image:url(' + escapeHtml(cover) + ')"></div>' +
          '</div>' +
          '<div class="content__group">' +
            '<div class="content__title">' +
              '<span class="oh"><span class="oh__inner">' + escapeHtml(w.title) + '</span></span>' +
            '</div>' +
            tagsHtml +
            '<div class="content__text">' + escapeHtml(w.excerpt || w.summary || "") + '</div>' +
            linkHtml +
          '</div>' +
          thumbsHtml +
        '</div>'
      );
    }).join("");
  }

  /* ================================================================
     PreviewItem
     ================================================================ */

  function PreviewItem(el, contentEl, index) {
    this.DOM = {
      el: el,
      imageWrap: el.querySelector(".preview__img-wrap"),
      image: el.querySelector(".preview__img"),
      imageInner: el.querySelector(".preview__img-inner"),
      title: el.querySelector(".preview__title"),
      titleInner: el.querySelector(".oh__inner"),
      description: el.querySelector(".preview__desc")
    };
    this.content = {
      DOM: {
        el: contentEl,
        titleInner: contentEl.querySelector(".content__title .oh__inner"),
        metaInner: contentEl.querySelector(".content__meta .oh__inner"),
        text: contentEl.querySelector(".content__text"),
        thumbs: contentEl.querySelector(".content__thumbs")
      }
    };
    this.index = index;
  }

  /* ================================================================
     Parallax on scroll (replaces ScrollTrigger)
     ================================================================ */

  function updateParallax() {
    for (var i = 0; i < previewItems.length; i++) {
      var item = previewItems[i];
      var rect = item.DOM.el.getBoundingClientRect();
      var wh = window.innerHeight;
      // progress: 0 when top enters viewport bottom, 1 when bottom leaves viewport top
      var progress = (wh - rect.top) / (wh + rect.height);
      var t = Math.max(0, Math.min(1, progress));

      item.DOM.imageInner.style.transform = "scaleY(" + (1 + t * PARALLAX_SCALE).toFixed(4) + ")";
      item.DOM.title.style.transform = "translateY(" + (-t * 100).toFixed(2) + "%)";
    }
    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(updateParallax);
      scrollTicking = true;
    }
  }

  /* ================================================================
     Flip: Expand (card → detail)
     ================================================================ */

  function showContent(item) {
    if (isAnimating) return;
    isAnimating = true;
    currentItem = previewItems.indexOf(item);

    /* capture source rect (visible image-wrap area) */
    var sourceWrap = item.DOM.imageWrap;
    var sourceRect = sourceWrap.getBoundingClientRect();
    var bgImage = item.DOM.imageInner.style.backgroundImage;

    /* create flying clone */
    var clone = document.createElement("div");
    clone.className = "fly-image";
    clone.style.left   = sourceRect.left + "px";
    clone.style.top    = sourceRect.top + "px";
    clone.style.width  = sourceRect.width + "px";
    clone.style.height = sourceRect.height + "px";
    clone.style.backgroundImage = bgImage;
    document.body.appendChild(clone);
    flyingImage = clone;

    /* hide grid image */
    item.DOM.image.style.opacity = "0";

    /* show overlay */
    document.body.classList.add("content-open");
    item.content.DOM.el.classList.add("content--current");

    /* hide content image initially (will be revealed after flip) */
    var contentImgInner = item.content.DOM.el.querySelector(".preview__img-inner");
    if (contentImgInner) contentImgInner.style.opacity = "0";

    /* set content text initial hidden states */
    setContentTextHidden(item, true);

    /* force layout, then read target rect */
    clone.offsetHeight;
    var targetEl = item.content.DOM.el.querySelector(".content__img");
    var targetRect = targetEl.getBoundingClientRect();

    /* animate clone from source → target */
    clone.style.transition = "left " + FLIP_DURATION + "ms " + FLIP_EASING +
      ", top " + FLIP_DURATION + "ms " + FLIP_EASING +
      ", width " + FLIP_DURATION + "ms " + FLIP_EASING +
      ", height " + FLIP_DURATION + "ms " + FLIP_EASING;
    clone.style.left   = targetRect.left + "px";
    clone.style.top    = targetRect.top + "px";
    clone.style.width  = targetRect.width + "px";
    clone.style.height = targetRect.height + "px";

    /* hide adjacent cards */
    hideAdjacent(item, true);

    /* hide preview title / desc */
    item.DOM.titleInner.style.opacity = "0";
    item.DOM.titleInner.style.transform = "translateY(101%)";
    if (item.DOM.description) {
      item.DOM.description.style.opacity = "0";
      item.DOM.description.style.transform = "translateY(101%)";
    }

    /* show back button */
    backCtrl.style.transition = "opacity 300ms ease";
    backCtrl.style.opacity = "1";

    /* stagger content text reveal */
    setTimeout(function () {
      revealContentText(item);
    }, TEXT_DELAY);

    /* cleanup on transition end */
    onTransitionEnd(clone, function () {
      if (flyingImage === clone) {
        clone.remove();
        flyingImage = null;
      }
      if (contentImgInner) contentImgInner.style.opacity = "1";
      isAnimating = false;
    });
  }

  /* ================================================================
     Flip: Collapse (detail → card)
     ================================================================ */

  function hideContent() {
    if (isAnimating || currentItem < 0) return;
    isAnimating = true;

    var item = previewItems[currentItem];
    var contentEl = item.content.DOM.el;

    /* hide content image */
    var contentImgInner = contentEl.querySelector(".preview__img-inner");
    if (contentImgInner) contentImgInner.style.opacity = "0";

    /* capture source rect (content image area) */
    var contentImg = contentEl.querySelector(".content__img");
    var sourceRect = contentImg.getBoundingClientRect();
    var bgImage = item.DOM.imageInner.style.backgroundImage;

    /* create flying clone at content position */
    var clone = document.createElement("div");
    clone.className = "fly-image";
    clone.style.left   = sourceRect.left + "px";
    clone.style.top    = sourceRect.top + "px";
    clone.style.width  = sourceRect.width + "px";
    clone.style.height = sourceRect.height + "px";
    clone.style.backgroundImage = bgImage;
    document.body.appendChild(clone);
    flyingImage = clone;

    /* hide overlay content */
    contentEl.classList.remove("content--current");
    backCtrl.style.opacity = "0";

    /* hide content text */
    setContentTextHidden(item, false);

    /* restore adjacent cards */
    hideAdjacent(item, false);

    /* reveal preview title / desc */
    item.DOM.titleInner.style.opacity = "1";
    item.DOM.titleInner.style.transform = "translateY(0)";
    if (item.DOM.description) {
      item.DOM.description.style.opacity = "1";
      item.DOM.description.style.transform = "translateY(0)";
    }

    /* force layout, read target rect */
    clone.offsetHeight;
    var targetWrap = item.DOM.imageWrap;
    var targetRect = targetWrap.getBoundingClientRect();

    /* animate clone from content → grid */
    clone.style.transition = "left " + FLIP_DURATION + "ms " + FLIP_EASING +
      ", top " + FLIP_DURATION + "ms " + FLIP_EASING +
      ", width " + FLIP_DURATION + "ms " + FLIP_EASING +
      ", height " + FLIP_DURATION + "ms " + FLIP_EASING;
    clone.style.left   = targetRect.left + "px";
    clone.style.top    = targetRect.top + "px";
    clone.style.width  = targetRect.width + "px";
    clone.style.height = targetRect.height + "px";

    onTransitionEnd(clone, function () {
      if (flyingImage === clone) {
        clone.remove();
        flyingImage = null;
      }
      item.DOM.image.style.opacity = "1";
      document.body.classList.remove("content-open");
      isAnimating = false;

      /* trigger one parallax update to fix positions */
      updateParallax();
    });
  }

  /* ================================================================
     Content text animation helpers
     ================================================================ */

  function setContentTextHidden(item, isExpand) {
    var els = [
      item.content.DOM.titleInner,
      item.content.DOM.metaInner
    ];
    for (var i = 0; i < els.length; i++) {
      if (els[i]) {
        els[i].style.transition = "none";
        els[i].style.opacity = "0";
        els[i].style.transform = "translateY(" + (isExpand ? "30px" : "-30px") + ")";
      }
    }
    if (item.content.DOM.text) {
      item.content.DOM.text.style.transition = "none";
      item.content.DOM.text.style.opacity = "0";
    }
    if (item.content.DOM.thumbs) {
      item.content.DOM.thumbs.style.transition = "none";
      item.content.DOM.thumbs.style.opacity = "0";
      item.content.DOM.thumbs.style.transform = "translateY(30px)";
    }
  }

  function revealContentText(item) {
    var els = [
      item.content.DOM.titleInner,
      item.content.DOM.metaInner
    ];
    for (var i = 0; i < els.length; i++) {
      if (els[i]) {
        els[i].style.transition = "opacity " + TEXT_DURATION + "ms ease, transform " + TEXT_DURATION + "ms ease";
        els[i].style.opacity = "1";
        els[i].style.transform = "translateY(0)";
      }
    }
    if (item.content.DOM.text) {
      item.content.DOM.text.style.transition = "opacity " + TEXT_DURATION + "ms ease";
      item.content.DOM.text.style.opacity = "1";
    }
    if (item.content.DOM.thumbs) {
      item.content.DOM.thumbs.style.transition = "opacity " + TEXT_DURATION + "ms ease, transform " + TEXT_DURATION + "ms ease";
      item.content.DOM.thumbs.style.opacity = "1";
      item.content.DOM.thumbs.style.transform = "translateY(0)";
    }
  }

  /* ================================================================
     Adjacent cards — slide off/on screen
     ================================================================ */

  function hideAdjacent(item, hide) {
    var itemIndex = previewItems.indexOf(item);
    for (var i = 0; i < previewItems.length; i++) {
      var other = previewItems[i];
      if (other === item) continue;
      var rect = other.DOM.el.getBoundingClientRect();
      var inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!inView && !hide) {
        // When restoring, only touch cards that were previously moved.
        // Simplification: restore all.
      }
      if (hide) {
        var dir = i < itemIndex ? -window.innerHeight : window.innerHeight;
        other.DOM.el.style.transition = "transform " + FLIP_DURATION + "ms " + FLIP_EASING;
        other.DOM.el.style.transform = "translateY(" + dir + "px)";
      } else {
        other.DOM.el.style.transition = "transform " + FLIP_DURATION + "ms " + FLIP_EASING;
        other.DOM.el.style.transform = "translateY(0)";
      }
    }
  }

  /* ================================================================
     Events
     ================================================================ */

  function initEvents() {
    /* click card → expand */
    previewWrap.addEventListener("click", function (e) {
      if (isAnimating) return;
      var card = e.target.closest(".preview");
      if (!card) return;
      var idx = parseInt(card.getAttribute("data-index"), 10);
      if (isNaN(idx) || idx < 0 || idx >= previewItems.length) return;
      showContent(previewItems[idx]);
    });

    /* back button → collapse */
    backCtrl.addEventListener("click", function () {
      if (isAnimating) return;
      hideContent();
    });

    /* ESC key → collapse */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && currentItem >= 0 && !isAnimating) {
        hideContent();
      }
    });
  }

  /* ================================================================
     Init
     ================================================================ */

  function init() {
    previewItems = [];
    var previewEls = document.querySelectorAll(".preview");
    var contentEls = document.querySelectorAll(".content");

    for (var i = 0; i < previewEls.length; i++) {
      previewItems.push(new PreviewItem(previewEls[i], contentEls[i], i));
    }

    document.body.classList.remove("loading");

    /* start parallax loop */
    window.addEventListener("scroll", onScroll, { passive: true });
    updateParallax();

    initEvents();
  }

  /* ================================================================
     Bootstrap
     ================================================================ */

  loadWorksData()
    .then(function (works) {
      buildPreviews(works);
      buildContents(works);
      requestAnimationFrame(function () {
        init();
      });
    })
    .catch(function (err) {
      console.error("Failed to load works data:", err);
      document.body.classList.remove("loading");
    });
})();
