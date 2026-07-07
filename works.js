/* ============================================
   Works Page — Image to Content transition
   ============================================ */
(function () {
  var BlogShared = window.BlogShared;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var Flip = window.Flip;
  var Lenis = window.Lenis;

  if (!BlogShared || !gsap || !ScrollTrigger || !Flip) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.registerPlugin(Flip);

  var ANIM = { duration: 1.2, ease: "power4.inOut" };

  var previewWrap = document.querySelector("[data-preview-wrap]");
  var contentWrap = document.querySelector("[data-content-wrap]");
  var backCtrl = document.querySelector(".action--back");

  var previewItems = [];
  var currentItem = -1;
  var isAnimating = false;
  var lenis;

  /* ---- placeholder images for padding ---- */
  var PLACEHOLDER_IMAGES = [
    "assets/1.jpg",
    "assets/2.jpg",
    "assets/3.jpg",
    "assets/4.jpg",
    "assets/5.jpg",
    "assets/6.jpg",
    "assets/7.jpg"
  ];

  /* ---- helpers ---- */
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

  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  /* ---- data loading ---- */
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

  /* ---- build DOM ---- */
  function buildPreviews(works) {
    previewWrap.innerHTML = works
      .map(function (w, i) {
        var cover = resolveCover(w);
        return (
          '<div class="preview" data-index="' +
          i +
          '">' +
          '<div class="preview__img-wrap">' +
          '<div class="preview__img">' +
          '<div class="preview__img-inner" style="background-image:url(' +
          escapeHtml(cover) +
          ')"></div>' +
          "</div>" +
          "</div>" +
          '<div class="preview__title">' +
          '<h2 class="preview__title-main">' +
          '<span class="oh"><span class="oh__inner">' +
          escapeHtml(w.title) +
          "</span></span>" +
          "</h2>" +
          '<p class="preview__desc">' +
          escapeHtml(w.excerpt || w.summary || "") +
          "</p>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function buildContents(works) {
    contentWrap.innerHTML = works
      .map(function (w, i) {
        var cover = resolveCover(w);
        var tagsHtml = "";
        if (w.tags && w.tags.length) {
          tagsHtml =
            '<div class="content__meta oh"><span class="oh__inner">' +
            w.tags.map(function (t) { return escapeHtml(t); }).join("  ·  ") +
            "</span></div>";
        }
        var linkHtml = "";
        if (w.path && !w.isPlaceholder) {
          linkHtml =
            '<a class="content__link" href="' +
            escapeHtml(w.path) +
            '">查看详情</a>';
        }
        var thumbsHtml = "";
        if (!w.isPlaceholder && w.imageDir) {
          thumbsHtml =
            '<div class="content__thumbs">' +
            [1, 2, 3, 4]
              .map(function () {
                return '<div class="content__thumbs-item"></div>';
              })
              .join("") +
            "</div>";
        }
        return (
          '<div class="content" data-index="' +
          i +
          '">' +
          '<div class="content__img">' +
          '<div class="preview__img-inner" style="background-image:url(' +
          escapeHtml(cover) +
          ')"></div>' +
          "</div>" +
          '<div class="content__group">' +
          '<div class="content__title">' +
          '<span class="oh"><span class="oh__inner">' +
          escapeHtml(w.title) +
          "</span></span>" +
          "</div>" +
          tagsHtml +
          '<div class="content__text">' +
          escapeHtml(w.excerpt || w.summary || "") +
          "</div>" +
          linkHtml +
          "</div>" +
          thumbsHtml +
          "</div>"
        );
      })
      .join("");
  }

  /* ---- PreviewItem ---- */
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
        titleInner: contentEl.querySelector(".oh__inner"),
        metaInner: contentEl.querySelector(".content__meta .oh__inner"),
        text: contentEl.querySelector(".content__text"),
        thumbs: contentEl.querySelector(".content__thumbs"),
        thumbsItems: contentEl.querySelectorAll(".content__thumbs-item")
      }
    };
    this.index = index;
    this.imageInnerScaleYCached = 1;
    this.scrollTimeline = null;
  }

  /* ---- Scroll animations ---- */
  function animateOnScroll() {
    previewItems.forEach(function (item) {
      gsap.set(item.DOM.imageInner, { transformOrigin: "50% 0%" });
      item.scrollTimeline = gsap
        .timeline({
          scrollTrigger: {
            trigger: item.DOM.el,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        })
        .addLabel("start", 0)
        .to(item.DOM.title, { ease: "none", yPercent: -100 }, "start")
        .to(item.DOM.imageInner, { ease: "none", scaleY: 1.8 }, "start");
    });
  }

  /* ---- get adjacent visible items ---- */
  function getAdjacentItems(item) {
    var arr = [];
    previewItems.forEach(function (other, pos) {
      if (other !== item && isInViewport(other.DOM.el)) {
        arr.push({ position: pos, item: other });
      }
    });
    return arr;
  }

  /* ---- show content (Flip expand) ---- */
  function showContent(item) {
    var itemIndex = previewItems.indexOf(item);
    var adjacent = getAdjacentItems(item);
    item.adjacentItems = adjacent;

    var imageInnerEl = item.DOM.imageInner;
    var contentImgInner = item.content.DOM.el.querySelector(".preview__img-inner");

    var tl = gsap.timeline({
      defaults: ANIM,
      onStart: function () {
        lenis.stop();
        document.body.classList.add("content-open");
        item.content.DOM.el.classList.add("content--current");

        gsap.set(
          [
            item.content.DOM.titleInner,
            item.content.DOM.metaInner
          ].filter(Boolean),
          { yPercent: -101, opacity: 0 }
        );

        if (item.content.DOM.thumbs) {
          gsap.set(item.content.DOM.thumbs, {
            transformOrigin: "0% 0%",
            scale: 0,
            yPercent: 150
          });
        }

        gsap.set(
          [item.content.DOM.text, backCtrl].filter(Boolean),
          { opacity: 0 }
        );

        try {
          var rect = imageInnerEl.getBoundingClientRect();
          item.imageInnerScaleYCached =
            rect.height / imageInnerEl.offsetHeight || 1;
        } catch (e) {
          item.imageInnerScaleYCached = 1;
        }
      },
      onComplete: function () {
        isAnimating = false;
      }
    }).addLabel("start", 0);

    // hide adjacent items
    adjacent.forEach(function (adj) {
      var dir = adj.position < itemIndex ? -window.innerHeight : window.innerHeight;
      tl.to(adj.item.DOM.el, { y: dir }, "start");
    });

    // Flip: move image from preview to content
    tl.add(function () {
      var flipState = Flip.getState(item.DOM.image);
      item.content.DOM.el
        .querySelector(".content__img")
        .appendChild(item.DOM.image);
      Flip.from(flipState, {
        duration: ANIM.duration,
        ease: ANIM.ease,
        absolute: true
      });
    }, "start");

    // hide preview title
    tl.to(item.DOM.titleInner, { yPercent: 101, opacity: 0, stagger: -0.03 }, "start");
    // hide preview desc
    tl.to(item.DOM.description, { yPercent: 101, opacity: 0 }, "start");
    // reset image scale
    tl.to(imageInnerEl, { scaleY: 1 }, "start");

    // content elements come in
    tl.addLabel("content", 0.15);
    tl.to(backCtrl, { opacity: 1 }, "content");
    if (item.content.DOM.titleInner) {
      tl.to(item.content.DOM.titleInner, { yPercent: 0, opacity: 1, stagger: -0.05 }, "content");
    }
    if (item.content.DOM.metaInner) {
      tl.to(item.content.DOM.metaInner, { yPercent: 0, opacity: 1 }, "content");
    }
    if (item.content.DOM.thumbs) {
      tl.to(item.content.DOM.thumbs, { scale: 1, yPercent: 0, stagger: -0.05 }, "content");
    }
    tl.to(item.content.DOM.text, { opacity: 1 }, "content");
  }

  /* ---- hide content (Flip collapse) ---- */
  function hideContent() {
    var item = previewItems[currentItem];
    if (!item) {
      isAnimating = false;
      return;
    }

    var imageInnerEl = item.DOM.imageInner;

    gsap
      .timeline({
        defaults: ANIM,
        onComplete: function () {
          lenis.start();
          document.body.classList.remove("content-open");
          item.content.DOM.el.classList.remove("content--current");
          isAnimating = false;
        }
      })
      .addLabel("start", 0)
      // hide back button
      .to(backCtrl, { opacity: 0 }, "start")
      // hide content title
      .to(
        item.content.DOM.titleInner,
        { yPercent: -101, opacity: 0, stagger: 0.05 },
        "start"
      )
      // hide content meta
      .to(
        item.content.DOM.metaInner,
        { yPercent: -101, opacity: 0 },
        "start"
      )
      // hide content thumbs
      .to(
        item.content.DOM.thumbs,
        { scale: 0, yPercent: 150, stagger: -0.05 },
        "start"
      )
      // hide content text
      .to(item.content.DOM.text, { opacity: 0 }, "start")
      // preview elements come in
      .addLabel("preview", 0.15)
      // show adjacent items
      .to(
        item.adjacentItems.map(function (a) { return a.item.DOM.el; }),
        { y: 0 },
        "preview"
      )
      // Flip: move image back to preview
      .add(function () {
        var flipState = Flip.getState(item.DOM.image);
        item.DOM.imageWrap.appendChild(item.DOM.image);
        Flip.from(flipState, {
          duration: ANIM.duration,
          ease: ANIM.ease,
          absolute: true
        });
      }, "preview")
      // show preview title
      .to(item.DOM.titleInner, { yPercent: 0, opacity: 1, stagger: 0.03 }, "preview")
      // show preview desc
      .to(item.DOM.description, { yPercent: 0, opacity: 1 }, "preview")
      // restore image scale
      .to(imageInnerEl, { scaleY: item.imageInnerScaleYCached }, "preview");
  }

  /* ---- events ---- */
  function initEvents() {
    previewItems.forEach(function (item, pos) {
      item.DOM.imageWrap.addEventListener("click", function () {
        if (isAnimating) return;
        isAnimating = true;
        currentItem = pos;
        showContent(item);
      });
    });

    backCtrl.addEventListener("click", function () {
      if (isAnimating) return;
      isAnimating = true;
      hideContent();
    });
  }

  /* ---- smooth scroll ---- */
  function initSmoothScroll() {
    lenis = new Lenis({
      lerp: 0.1,
      smooth: true,
      direction: "vertical"
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* ---- init ---- */
  function init(works) {
    previewItems = [];
    var previewEls = document.querySelectorAll(".preview");
    var contentEls = document.querySelectorAll(".content");

    previewEls.forEach(function (el, i) {
      previewItems.push(new PreviewItem(el, contentEls[i], i));
    });

    document.body.classList.remove("loading");
    initSmoothScroll();
    animateOnScroll();
    initEvents();
  }

  /* ---- bootstrap ---- */
  loadWorksData()
    .then(function (works) {
      buildPreviews(works);
      buildContents(works);
      // wait for DOM to settle, then init
      requestAnimationFrame(function () {
        init(works);
      });
    })
    .catch(function (err) {
      console.error("Failed to load works data:", err);
      document.body.classList.remove("loading");
    });
})();
