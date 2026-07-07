(() => {
  const pageShell = document.querySelector(".page-shell");

  if (!pageShell) {
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = `
    <footer class="site-footer" aria-label="备案信息">
      <div class="site-footer-inner">
        <p>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            ICP备案号：湘ICP备2026027181号-1
          </a>
        </p>
      </div>
    </footer>
  `.trim();

  const nextFooter = template.content.firstElementChild;

  if (!nextFooter) {
    return;
  }

  const currentFooter = pageShell.querySelector(".site-footer");

  if (currentFooter) {
    currentFooter.replaceWith(nextFooter);
    return;
  }

  pageShell.append(nextFooter);
})();
