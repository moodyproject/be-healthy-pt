/* Be Healthy PT - Interactivity */
document.addEventListener('DOMContentLoaded', () => {

  // =====================
  // 1. SLIDESHOW CAROUSELS
  // =====================
  // Structure: section > [container div > ul.track > li slides] + [.framer--slideshow-controls]
  // Framer froze buttons as display:none and controls as pointer-events:none.
  // We fix that, hide duplicate slides, and wire up prev/next + dots.

  document.querySelectorAll('.framer--slideshow-controls').forEach(controls => {
    const section = controls.parentElement;
    const container = section.children[0];
    if (!container || container === controls) return;

    const track = container.querySelector('ul');
    if (!track) return;

    // Fix controls visibility — framer sets pointer-events:none on the overlay
    controls.style.pointerEvents = 'none'; // keep overlay non-blocking
    // But make the button container and buttons clickable
    Array.from(controls.children).forEach(child => {
      child.style.pointerEvents = 'auto';
    });

    // Fix button visibility — framer hides prev/next with display:none
    const prevBtn = controls.querySelector('[aria-label="Previous"]');
    const nextBtn = controls.querySelector('[aria-label="Next"]');
    if (prevBtn) {
      prevBtn.style.display = 'block';
      prevBtn.style.pointerEvents = 'auto';
      prevBtn.style.cursor = 'pointer';
    }
    if (nextBtn) {
      nextBtn.style.display = 'block';
      nextBtn.style.pointerEvents = 'auto';
      nextBtn.style.cursor = 'pointer';
    }

    // Show buttons on hover, hide when not
    section.addEventListener('mouseenter', () => {
      if (prevBtn) prevBtn.style.opacity = '1';
      if (nextBtn) nextBtn.style.opacity = '1';
    });
    section.addEventListener('mouseleave', () => {
      if (prevBtn) prevBtn.style.opacity = '0.5';
      if (nextBtn) nextBtn.style.opacity = '0.5';
    });

    // Get real slides (not aria-hidden duplicates)
    const allLis = Array.from(track.querySelectorAll(':scope > li'));
    const realSlides = allLis.filter(li => li.getAttribute('aria-hidden') !== 'true');
    if (realSlides.length < 2) return;

    // Hide duplicate slides
    allLis.forEach(li => {
      if (li.getAttribute('aria-hidden') === 'true') {
        li.style.display = 'none';
      }
    });

    // Ensure track doesn't clip and uses flex properly
    track.style.overflow = 'visible';
    track.style.touchAction = 'pan-y';
    track.style.cursor = 'grab';

    const gap = parseInt(track.style.gap) || 0;
    let currentIndex = 0;

    function getSlideWidth() {
      // Slides use display:contents so measure their inner div
      const inner = realSlides[0].querySelector(':scope > div');
      if (inner) return inner.offsetWidth;
      // Fallback: container width
      return container.offsetWidth;
    }

    function goTo(idx) {
      if (idx < 0) idx = realSlides.length - 1;
      if (idx >= realSlides.length) idx = 0;
      currentIndex = idx;
      const slideW = getSlideWidth();
      track.style.transition = 'transform 0.4s ease';
      track.style.transform = `translateX(${-currentIndex * (slideW + gap)}px)`;
      updateDots();
    }

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(currentIndex + 1); });

    // Dot indicators
    const dots = controls.querySelectorAll('[aria-label^="Scroll to page"]');
    function updateDots() {
      dots.forEach((dot, i) => {
        dot.style.opacity = i === currentIndex ? '1' : '0.4';
      });
    }
    dots.forEach((dot, i) => {
      dot.style.pointerEvents = 'auto';
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => goTo(i));
    });

    // Touch/swipe support
    let startX = 0;
    let isDragging = false;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isDragging = true; });
    track.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        goTo(currentIndex + (diff < 0 ? 1 : -1));
      }
    });

    // Initialize at slide 0
    goTo(0);
  });


  // =====================
  // 2. FAQ ACCORDION
  // =====================
  document.querySelectorAll('[data-framer-name="Closed"]').forEach(item => {
    const question = item.querySelector('[data-framer-name="Question"]');
    if (!question) return;

    const allChildren = Array.from(item.children);
    const qIdx = allChildren.indexOf(question);
    const answer = allChildren[qIdx + 1];

    if (answer) {
      answer.style.display = 'none';
      answer.style.transition = 'opacity 0.3s ease';
    }

    const plus = item.querySelector('[data-framer-name="Plus"]');
    if (plus) {
      plus.style.transition = 'transform 0.3s ease';
      plus.style.cursor = 'pointer';
    }

    question.style.cursor = 'pointer';
    question.addEventListener('click', () => {
      const isOpen = answer && answer.style.display !== 'none';

      // Close all others
      document.querySelectorAll('[data-framer-name="Closed"]').forEach(other => {
        if (other === item) return;
        const oChildren = Array.from(other.children);
        const oQ = other.querySelector('[data-framer-name="Question"]');
        if (!oQ) return;
        const oIdx = oChildren.indexOf(oQ);
        const oA = oChildren[oIdx + 1];
        if (oA) oA.style.display = 'none';
        const oPlus = other.querySelector('[data-framer-name="Plus"]');
        if (oPlus) oPlus.style.transform = 'none';
      });

      if (answer) answer.style.display = isOpen ? 'none' : 'block';
      if (plus) plus.style.transform = isOpen ? 'none' : 'rotate(45deg)';
    });
  });


  // =====================
  // 3. TRAINER CARD OVERLAYS
  // =====================
  document.querySelectorAll('[data-framer-name="Overlay"]').forEach(overlay => {
    overlay.style.display = 'none';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '10';
    overlay.style.transition = 'opacity 0.3s ease';

    const card = overlay.parentElement;
    if (!card) return;
    card.style.cursor = 'pointer';
    card.style.position = 'relative';

    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-framer-name="X"]')) {
        overlay.style.display = 'none';
        return;
      }
      overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
    });

    const closeBtn = overlay.querySelector('[data-framer-name="X"]');
    if (closeBtn) {
      closeBtn.style.cursor = 'pointer';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.style.display = 'none';
      });
    }
  });


  // =====================
  // 4. HAMBURGER MENU (MOBILE)
  // =====================
  document.querySelectorAll('[data-framer-name="Menu"]').forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      const header = btn.closest('header') || btn.closest('nav') || btn.parentElement?.parentElement;
      if (!header) return;
      const navLinks = header.querySelector('nav') || header.querySelector('[data-framer-name="Services"]')?.parentElement;
      if (navLinks) {
        const isHidden = navLinks.style.display === 'none' || getComputedStyle(navLinks).display === 'none';
        navLinks.style.display = isHidden ? 'flex' : 'none';
      }
    });
  });


  // =====================
  // 5. SMOOTH SCROLL
  // =====================
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

});
