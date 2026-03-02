/* Be Healthy PT - Interactivity */
document.addEventListener('DOMContentLoaded', () => {

  // 1. FAQ Accordion
  const faqQuestions = document.querySelectorAll('[data-framer-name="Question"], [data-framer-name="Closed"]');
  faqQuestions.forEach(q => {
    q.style.cursor = 'pointer';
    const answer = q.nextElementSibling;
    if (answer && !answer.matches('[data-framer-name="Question"], [data-framer-name="Closed"]')) {
      // Check if it looks like an answer (has text content, not another question)
      // Initially hide answers
    }
    q.addEventListener('click', () => {
      const parent = q.closest('[data-framer-name="Item"]') || q.parentElement;
      if (!parent) return;
      
      // Find the answer/content part
      const children = [...parent.children];
      const qIdx = children.indexOf(q);
      
      // Toggle visibility of siblings after the question
      for (let i = qIdx + 1; i < children.length; i++) {
        const child = children[i];
        if (child.style.display === 'none') {
          child.style.display = '';
          // Rotate plus icon
          const plus = q.querySelector('[data-framer-name="Plus"]');
          if (plus) plus.style.transform = 'rotate(45deg)';
        } else {
          child.style.display = 'none';
          const plus = q.querySelector('[data-framer-name="Plus"]');
          if (plus) plus.style.transform = '';
        }
      }
    });
  });

  // 2. Mobile hamburger menu
  const menuBtns = document.querySelectorAll('[data-framer-name="Menu"]');
  menuBtns.forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      const nav = document.querySelector('[data-framer-name="Services"]')?.closest('nav') || 
                  document.querySelector('nav');
      if (nav) {
        nav.style.display = nav.style.display === 'none' ? '' : 'none';
      }
    });
  });

  // 3. Trainer card popups
  const trainerCards = document.querySelectorAll('[data-framer-name="Gym Coach"], [data-framer-name="David smith"]');
  trainerCards.forEach(card => {
    card.style.cursor = 'pointer';
    
    // Find overlay related to this trainer
    const overlay = card.querySelector('[data-framer-name="Overlay"]');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.zIndex = '10';
      
      card.addEventListener('mouseenter', () => {
        overlay.style.opacity = '1';
      });
      card.addEventListener('mouseleave', () => {
        overlay.style.opacity = '0';
      });
      card.addEventListener('click', () => {
        overlay.style.opacity = overlay.style.opacity === '1' ? '0' : '1';
      });
    }
  });

  // 4. Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 5. Fix giant comma issue in testimonials
  // The "commas" are likely oversized quotation mark characters
  document.querySelectorAll('[data-framer-name="\\""]').forEach(el => {
    el.style.fontSize = '48px';
    el.style.lineHeight = '1';
  });

});
