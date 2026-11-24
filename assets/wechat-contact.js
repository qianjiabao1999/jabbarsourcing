/* 微信联系：只在明确点击复制后使用剪贴板；对话框与外层页面隔离。 */
(function () {
  "use strict";
  var modal = document.getElementById("wechat-modal");
  if (!modal) return;
  var card = modal.querySelector("[role=dialog]");
  var closeButton = card.querySelector("button[data-close-modal]");
  var copyButton = card.querySelector("[data-copy-contact]");
  var number = card.querySelector("strong");
  var hint = card.querySelector(".contact-modal-hint");
  var originalHint = hint.textContent;
  var originalLabel = copyButton.textContent;
  var copied = modal.getAttribute("data-copied-label");
  var manual = modal.getAttribute("data-manual-copy");
  var opener = null, version = 0, timer = 0, backdropTimer = 0, press = null;
  var inertNodes = [];

  function backgroundInert() {
    for (var branch = modal; branch !== document.body; branch = branch.parentElement) {
      Array.prototype.forEach.call(branch.parentElement.children, function (element) {
        if (element === branch || element.matches("script,style,link,template,[inert]")) return;
        element.setAttribute("inert", "");
        inertNodes.push(element);
      });
    }
  }
  function reset() {
    ++version;
    clearTimeout(timer);
    copyButton.textContent = originalLabel;
    hint.textContent = originalHint;
  }
  function open(trigger) {
    if (opener) return;
    reset();
    opener = trigger;
    modal.hidden = false;
    modal.classList.add("is-open");
    closeButton.focus({ preventScroll: true });
    backgroundInert();
  }
  function close(restoreFocus) {
    if (!opener) return;
    var trigger = opener;
    opener = null;
    clearTimeout(backdropTimer);
    press = null;
    reset();
    modal.classList.remove("is-open");
    modal.hidden = true;
    inertNodes.forEach(function (el) { el.removeAttribute("inert"); });
    inertNodes = [];
    if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  document.querySelectorAll('.js-contact-modal-open[data-modal-target="wechat-modal"]').forEach(function (trigger) {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", modal.id);
    trigger.addEventListener("click", function (event) { event.preventDefault(); open(trigger); });
  });
  modal.querySelectorAll("[data-close-modal]").forEach(function (control) {
    control.addEventListener("click", function () { close(true); });
  });
  // 部分触屏 WebKit 在 RTL 视口边缘不会合成 click。等待原点击序列结束，
  // 只接管同一点的短按，避免拖动关窗或遮罩下方链接被误触。
  var backdrop = modal.querySelector(".contact-modal-backdrop");
  backdrop.addEventListener("pointerdown", function (e) {
    clearTimeout(backdropTimer);
    press = e.isPrimary && e.button === 0 ? { id:e.pointerId, x:e.clientX, y:e.clientY } : null;
  });
  backdrop.addEventListener("pointercancel", function () { press = null; });
  backdrop.addEventListener("pointerup", function (e) {
    var start = press;
    press = null;
    if (!start || start.id !== e.pointerId || Math.hypot(e.clientX-start.x, e.clientY-start.y) > 8) return;
    backdropTimer = setTimeout(function () { close(true); }, 380);
  });
  document.addEventListener("keydown", function (event) {
    if (!opener) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === "Tab") {
      // 本窗口只有关闭和复制两个按钮；手动复制时号码也可获得焦点。
      event.preventDefault();
      var active = document.activeElement;
      var next = active === number ? (event.shiftKey ? closeButton : copyButton)
        : active === closeButton ? copyButton : closeButton;
      next.focus();
    }
  }, true);
  document.addEventListener("focusin", function (event) {
    if (opener && !card.contains(event.target)) closeButton.focus({ preventScroll: true });
  });
  window.addEventListener("pagehide", function () { close(false); });

  copyButton.addEventListener("click", async function () {
    if (!opener) return;
    var current = ++version;
    clearTimeout(timer);
    copyButton.textContent = originalLabel;
    try {
      await navigator.clipboard.writeText(number.textContent.trim());
    } catch (error) {
      if (!opener || version !== current) return;
      hint.textContent = manual;
      number.focus({ preventScroll: true });
      var selection = window.getSelection();
      if (selection) {
        var range = document.createRange();
        range.selectNodeContents(number);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return;
    }
    if (!opener || version !== current) return;
    copyButton.textContent = copied;
    hint.textContent = copied + ". " + originalHint;
    timer = setTimeout(function () {
      if (version === current) {
        copyButton.textContent = originalLabel;
        hint.textContent = originalHint;
      }
    }, 1500);
  });
})();
