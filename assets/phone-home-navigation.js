// 手机首页的横滑提示和章节位置；导航链接本身不依赖脚本。
(function () {
  "use strict";
  const header = document.querySelector(".home-page header.site-nav");
  const rail = header && header.querySelector(".phone-chapters");
  if (!rail) return;
  const links = Array.from(rail.querySelectorAll("a[href^='#']"));
  const chapters = links.map(link => [link, document.getElementById(link.hash.slice(1))])
    .filter(([, section]) => section);
  if (!chapters.length) return;
  const media = matchMedia("(max-width: 767px)");
  let frame = 0, observer, current = null;

  function setCurrent(link) {
    if (link === current) return;
    if (current) current.removeAttribute("aria-current");
    current = link;
    if (!link) return;
    link.setAttribute("aria-current", "location");
    // 仅移动栏目栏；保留页面位置、键盘焦点和用户主动横滑的位置。
    if (rail.contains(document.activeElement) && document.activeElement !== link) return;
    const item = link.getBoundingClientRect(), edge = rail.getBoundingClientRect();
    if (item.left < edge.left - 1) rail.scrollLeft += item.left - edge.left;
    else if (item.right > edge.right + 1) rail.scrollLeft += item.right - edge.right;
  }

  function update() {
    frame = 0;
    const nav = header.getBoundingClientRect();
    const margin = Math.ceil(nav.height) + 16 + "px";
    if (document.body.style.getPropertyValue("--phone-home-anchor") !== margin) {
      document.body.style.setProperty("--phone-home-anchor", margin);
    }
    const line = nav.bottom + 18; // 16px 锚点留白，另容纳亚像素舍入。
    let match = chapters.find(([, section]) => {
      const box = section.getBoundingClientRect();
      return box.top <= line && box.bottom > line;
    });
    // 页尾不足以将最后一节滚到页首；在自然终点标示屏内最下方的栏目。
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      let lowest = -Infinity;
      for (const chapter of chapters) {
        const box = chapter[1].getBoundingClientRect();
        if (box.bottom > line && box.top < window.innerHeight && box.top > lowest) {
          match = chapter;
          lowest = box.top;
        }
      }
    }
    setCurrent(match ? match[0] : null);

    // 比较物理边界，而非假设 RTL 浏览器的 scrollLeft 方向。
    const edge = rail.getBoundingClientRect();
    const first = links[0].getBoundingClientRect(), last = links[links.length - 1].getBoundingClientRect();
    rail.toggleAttribute("data-more-left", Math.min(first.left, last.left) < edge.left - 1);
    rail.toggleAttribute("data-more-right", Math.max(first.right, last.right) > edge.right + 1);
  }
  function schedule() {
    if (media.matches && !frame) frame = requestAnimationFrame(update);
  }
  function syncViewport() {
    if (media.matches) {
      update();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      window.addEventListener("pageshow", schedule);
      window.addEventListener("hashchange", schedule);
      rail.addEventListener("scroll", schedule, { passive: true });
      if ("ResizeObserver" in window) {
        observer = new ResizeObserver(schedule);
        [header, rail, document.body, ...links].forEach(el => observer.observe(el));
      }
    } else {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      window.removeEventListener("hashchange", schedule);
      rail.removeEventListener("scroll", schedule);
      if (observer) { observer.disconnect(); observer = null; }
      cancelAnimationFrame(frame); frame = 0;
      document.body.style.removeProperty("--phone-home-anchor");
      rail.removeAttribute("data-more-left");
      rail.removeAttribute("data-more-right");
      setCurrent(null);
    }
  }
  if (media.addEventListener) media.addEventListener("change", syncViewport);
  else media.addListener(syncViewport);
  if (media.matches) syncViewport();
}());
