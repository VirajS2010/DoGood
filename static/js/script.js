function showChosenFile(input) {
  const fileNameEl = document.getElementById("file-name");
  const preview = document.getElementById("preview");
  if (!input || !input.files || input.files.length === 0) {
    fileNameEl.textContent = "No file selected";
    preview.style.backgroundImage = "";
    preview.setAttribute("aria-hidden", "true");
    return;
  }
  const file = input.files[0];
  fileNameEl.textContent = file.name;

  // preview (images only)
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.style.backgroundImage = `url('${e.target.result}')`;
      preview.setAttribute("aria-hidden", "false");
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.backgroundImage = "";
    preview.setAttribute("aria-hidden", "true");
  }
}

function toggleMenu() {
  const s = document.getElementById("sheet");
  if (!s) return;
  const isHidden = s.getAttribute("aria-hidden") !== "false";
  s.setAttribute("aria-hidden", isHidden ? "false" : "true");
}

document.addEventListener("click", (e) => {
  const s = document.getElementById("sheet");
  if (!s) return;
  if (s.getAttribute("aria-hidden") === "false") {
    // click outside to close
    if (
      !e.target.closest(".sheet-content") &&
      !e.target.closest(".hamburger")
    ) {
      s.setAttribute("aria-hidden", "true");
    }
  }
});

// DoGood Reels: one card per gesture (wheel / swipe / arrows)
(function () {
  const viewport = document.getElementById("reels");
  if (!viewport) return;

  const stack = viewport.querySelector(".reels-stack");
  let cards = Array.from(stack.querySelectorAll(".reel-card"));
  let index = 0;
  let animating = false;

  // Ensure each card is visible height-wise
  function layout() {
    // (CSS already sets heights responsively)
    cards = Array.from(stack.querySelectorAll(".reel-card"));
    // Snap to current card on layout
    cards[index]?.scrollIntoView({ behavior: "instant", block: "start" });
  }

  function goto(i) {
    if (animating) return;
    i = Math.max(0, Math.min(cards.length - 1, i));
    if (i === index) return;
    animating = true;
    cards[i].scrollIntoView({ behavior: "smooth", block: "start" });
    // unlock after the smooth scroll roughly ends
    setTimeout(() => {
      index = i;
      animating = false;
    }, 420);
  }

  // WHEEL / TRACKPAD
  let wheelLock = false;
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wheelLock || animating) return;
      wheelLock = true;
      const dir = e.deltaY > 0 ? 1 : -1;
      goto(index + dir);
      setTimeout(() => (wheelLock = false), 380);
    },
    { passive: false }
  );

  // TOUCH SWIPE
  let startY = 0,
    moved = false;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      startY = e.touches[0].clientY;
      moved = false;
    },
    { passive: true }
  );

  viewport.addEventListener(
    "touchmove",
    (e) => {
      moved = true;
      e.preventDefault();
    },
    { passive: false }
  );

  viewport.addEventListener(
    "touchend",
    (e) => {
      if (!moved) return;
      const endY = (e.changedTouches[0] || {}).clientY || startY;
      const dy = startY - endY;
      const THRESHOLD = 40;
      if (Math.abs(dy) > THRESHOLD) {
        goto(index + (dy > 0 ? 1 : -1));
      }
    },
    { passive: false }
  );

  // KEYBOARD
  window.addEventListener("keydown", (e) => {
    if (animating) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goto(index + 1);
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goto(index - 1);
    }
  });

  // Recompute on resize/load (prevents squish when viewport changes)
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  layout();
})();

// ---------- hamburger / sheet ----------
function toggleMenu() {
  const s = document.getElementById("sheet");
  if (!s) return;
  const open = s.getAttribute("aria-hidden") === "true";
  s.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("no-scroll", open);
}
document.addEventListener("click", (e) => {
  const s = document.getElementById("sheet");
  if (!s || s.getAttribute("aria-hidden") === "true") return;
  if (
    !e.target.closest(".sheet-content") &&
    !e.target.closest(".pill-hamburger")
  ) {
    s.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
});

// ---------- reels: one-card-per-flick (merged from reels.js) ----------
(function () {
  const viewport = document.getElementById("reels");
  if (!viewport) return;
  const stack = viewport.querySelector(".reels-stack");
  let cards = Array.from(stack.querySelectorAll(".reel-card"));
  let index = 0,
    animating = false;

  function layout() {
    cards = Array.from(stack.querySelectorAll(".reel-card"));
    cards[index]?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function goto(i) {
    if (animating) return;
    i = Math.max(0, Math.min(cards.length - 1, i));
    if (i === index) return;
    animating = true;
    cards[i].scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      index = i;
      animating = false;
    }, 420);
  }

  // wheel/trackpad
  let wheelLock = false;
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wheelLock || animating) return;
      wheelLock = true;
      goto(index + (e.deltaY > 0 ? 1 : -1));
      setTimeout(() => (wheelLock = false), 360);
    },
    { passive: false }
  );

  // touch swipe
  let startY = 0,
    moved = false;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      startY = e.touches[0].clientY;
      moved = false;
    },
    { passive: true }
  );
  viewport.addEventListener(
    "touchmove",
    (e) => {
      moved = true;
      e.preventDefault();
    },
    { passive: false }
  );
  viewport.addEventListener(
    "touchend",
    (e) => {
      if (!moved) return;
      const endY = (e.changedTouches[0] || {}).clientY || startY;
      const dy = startY - endY;
      if (Math.abs(dy) > 40) goto(index + (dy > 0 ? 1 : -1));
    },
    { passive: false }
  );

  // keys
  window.addEventListener("keydown", (e) => {
    if (animating) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goto(index + 1);
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goto(index - 1);
    }
  });

  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  layout();
})();

// ----- DoGood Reels: one card per flick (wheel / touch / keys) -----
(function () {
  const viewport = document.getElementById("reels");
  if (!viewport) return;
  const stack = viewport.querySelector(".reels-stack");
  let cards = Array.from(stack.querySelectorAll(".reel-card"));
  let index = 0,
    animating = false;

  function layout() {
    cards = Array.from(stack.querySelectorAll(".reel-card"));
    // snap to first (or current) card after layout to avoid any clipping
    cards[index]?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function goto(i) {
    if (animating) return;
    i = Math.max(0, Math.min(cards.length - 1, i));
    if (i === index) return;
    animating = true;
    cards[i].scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      index = i;
      animating = false;
    }, 420);
  }

  // wheel/trackpad
  let wheelLock = false;
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wheelLock || animating) return;
      wheelLock = true;
      goto(index + (e.deltaY > 0 ? 1 : -1));
      setTimeout(() => (wheelLock = false), 360);
    },
    { passive: false }
  );

  // touch
  let startY = 0,
    moved = false;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      startY = e.touches[0].clientY;
      moved = false;
    },
    { passive: true }
  );
  viewport.addEventListener(
    "touchmove",
    (e) => {
      moved = true;
      e.preventDefault();
    },
    { passive: false }
  );
  viewport.addEventListener(
    "touchend",
    (e) => {
      if (!moved) return;
      const endY = (e.changedTouches[0] || {}).clientY || startY;
      const dy = startY - endY;
      if (Math.abs(dy) > 40) goto(index + (dy > 0 ? 1 : -1));
    },
    { passive: false }
  );

  // keys
  window.addEventListener("keydown", (e) => {
    if (animating) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goto(index + 1);
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goto(index - 1);
    }
  });

  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  layout();
})();

// ===== DoGood Reels: one card per flick (wheel / touch / keys) =====
(function () {
  const viewport = document.getElementById("reels");
  if (!viewport) return;

  const stack = viewport.querySelector(".reels-stack");
  let cards = Array.from(stack.querySelectorAll(".reel-card"));
  let index = 0,
    animating = false;

  function layout() {
    // Re-query in case DOM changed
    cards = Array.from(stack.querySelectorAll(".reel-card"));
    // Snap to current card so first card never clips
    if (cards[index])
      cards[index].scrollIntoView({ behavior: "instant", block: "start" });
  }

  function goto(i) {
    if (animating) return;
    i = Math.max(0, Math.min(cards.length - 1, i));
    if (i === index) return;
    animating = true;
    cards[i].scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      index = i;
      animating = false;
    }, 420);
  }

  // Wheel / trackpad
  let wheelLock = false;
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wheelLock || animating) return;
      wheelLock = true;
      goto(index + (e.deltaY > 0 ? 1 : -1));
      setTimeout(() => (wheelLock = false), 360);
    },
    { passive: false }
  );

  // Touch swipe
  let startY = 0,
    moved = false;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      startY = e.touches[0].clientY;
      moved = false;
    },
    { passive: true }
  );

  viewport.addEventListener(
    "touchmove",
    (e) => {
      moved = true;
      e.preventDefault();
    },
    { passive: false }
  );

  viewport.addEventListener(
    "touchend",
    (e) => {
      if (!moved) return;
      const endY = (e.changedTouches[0] || {}).clientY || startY;
      const dy = startY - endY;
      if (Math.abs(dy) > 40) goto(index + (dy > 0 ? 1 : -1));
    },
    { passive: false }
  );

  // Keyboard
  window.addEventListener("keydown", (e) => {
    if (animating) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goto(index + 1);
    }
    if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goto(index - 1);
    }
  });

  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  layout();
})();

function copyById(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999); // for mobile
  navigator.clipboard.writeText(input.value).then(() => {
    const oldText = btn.innerText;
    btn.innerText = "Copied!";
    setTimeout(() => {
      btn.innerText = oldText;
    }, 1500);
  }).catch(err => {
    console.error("Copy failed:", err);
  });
}
