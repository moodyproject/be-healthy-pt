/* Be Healthy PT - Interactivity */
document.addEventListener('DOMContentLoaded', () => {

  // =====================
  // 1. SLIDESHOW CAROUSELS
  // =====================
  // Structure: section > [container div > ul.track > li slides] + [.framer--slideshow-controls]
  // Framer duplicates slides with aria-hidden="true" for infinite scroll illusion.
  // We use only the real (non-hidden) slides and translateX the track.

  document.querySelectorAll('.framer--slideshow-controls').forEach(controls => {
    const section = controls.parentElement;
    const container = section.children[0]; // first child is the slide container
    if (!container || container === controls) return;

    const track = container.querySelector('ul');
    if (!track) return;

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

    // Compute gap
    const gap = parseInt(track.style.gap) || 0;

    // Each slide's inner div is the visible card — measure its width
    let currentIndex = 0;

    function getSlideWidth() {
      const firstSlideInner = realSlides[0].querySelector(':scope > div');
      if (!firstSlideInner) return section.offsetWidth;
      return firstSlideInner.offsetWidth;
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

    // Wire up prev/next buttons
    const prevBtn = controls.querySelector('[aria-label="Previous"]');
    const nextBtn = controls.querySelector('[aria-label="Next"]');
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

    // Wire up dot indicators
    const dots = controls.querySelectorAll('[aria-label^="Scroll to page"]');
    function updateDots() {
      dots.forEach((dot, i) => {
        dot.style.opacity = i === currentIndex ? '1' : '0.4';
      });
    }
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });

    // Initialize: go to slide 0
    goTo(0);
  });


  // =====================
  // 2. FAQ ACCORDION
  // =====================
  document.querySelectorAll('[data-framer-name="Closed"]').forEach(item => {
    const question = item.querySelector('[data-framer-name="Question"]');
    if (!question) return;

    // Answer is the element after the question row inside this item
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
  // Each trainer card has data-framer-name="Overlay" inside it, initially hidden
  document.querySelectorAll('[data-framer-name="Overlay"]').forEach(overlay => {
    // Make sure overlay is hidden by default
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
      // If clicking the X button, close
      if (e.target.closest('[data-framer-name="X"]')) {
        overlay.style.display = 'none';
        return;
      }
      // Toggle overlay
      if (overlay.style.display === 'none') {
        overlay.style.display = 'block';
      } else {
        overlay.style.display = 'none';
      }
    });

    // Close button
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
  const menuBtns = document.querySelectorAll('[data-framer-name="Menu"]');
  menuBtns.forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      // Find the nav/menu container - typically a sibling or parent's child
      const header = btn.closest('header') || btn.closest('nav') || btn.parentElement?.parentElement;
      if (!header) return;

      // Look for a nav element or a div with links that should toggle
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
