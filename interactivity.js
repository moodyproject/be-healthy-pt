// Be Healthy PT - Interactivity (FAQ, Trainer Popups, Hamburger Menu)
document.addEventListener('DOMContentLoaded', () => {

  // === FAQ ACCORDION ===
  // Each FAQ item has data-framer-name="Closed" with a "Question" row and hidden answer
  document.querySelectorAll('[data-framer-name="Closed"]').forEach(item => {
    const question = item.querySelector('[data-framer-name="Question"]');
    if (!question) return;
    
    // Find the answer - it's a sibling or child that's hidden
    // In framer, the answer panel is usually the next element after the question row
    const allChildren = Array.from(item.children);
    const questionIdx = allChildren.indexOf(question);
    const answer = allChildren[questionIdx + 1]; // element after question
    
    if (answer) {
      answer.style.display = 'none';
      answer.style.overflow = 'hidden';
      answer.style.transition = 'max-height 0.3s ease';
    }
    
    // Plus icon rotation
    const plus = item.querySelector('[data-framer-name="Plus"]');
    if (plus) {
      plus.style.transition = 'transform 0.3s ease';
      plus.style.cursor = 'pointer';
    }
    
    question.style.cursor = 'pointer';
    question.addEventListener('click', () => {
      const isOpen = answer && answer.style.display !== 'none';
      
      // Close all others first
      document.querySelectorAll('[data-framer-name="Closed"]').forEach(other => {
        if (other === item) return;
        const otherChildren = Array.from(other.children);
        const otherQ = other.querySelector('[data-framer-name="Question"]');
        if (!otherQ) return;
        const otherIdx = otherChildren.indexOf(otherQ);
        const otherA = otherChildren[otherIdx + 1];
        if (otherA) otherA.style.display = 'none';
        const otherPlus = other.querySelector('[data-framer-name="Plus"]');
        if (otherPlus) otherPlus.style.transform = 'none';
      });
      
      if (answer) {
        answer.style.display = isOpen ? 'none' : 'block';
      }
      if (plus) {
        plus.style.transform = isOpen ? 'none' : 'rotate(45deg)';
      }
    });
  });

  // === TRAINER CARD HOVER - Show name/specialty ===
  // Trainer cards have data-framer-cursor and contain elements with opacity:0 and translateX(-280px)
  document.querySelectorAll('[data-framer-cursor]').forEach(card => {
    const hiddenName = card.querySelector('[data-framer-name="David smith"], [style*="translateX(-280px)"]');
    const hiddenSpec = card.querySelector('[data-framer-name="Gym Coach"]');
    
    if (hiddenName) {
      card.addEventListener('mouseenter', () => {
        hiddenName.style.opacity = '1';
        hiddenName.style.transform = 'none';
        hiddenName.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      });
      card.addEventListener('mouseleave', () => {
        hiddenName.style.opacity = '0';
        hiddenName.style.transform = 'translateX(-280px)';
      });
    }
  });

  // === HAMBURGER MENU (mobile) ===
  // Look for menu toggle elements
  const menuButtons = document.querySelectorAll('[data-framer-name="Menu"]');
  menuButtons.forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      // Find the mobile nav - usually an overlay or hidden nav section
      const overlay = document.getElementById('overlay');
      if (overlay) {
        const isVisible = overlay.style.display !== 'none' && overlay.style.opacity !== '0';
        overlay.style.display = isVisible ? 'none' : 'flex';
        overlay.style.opacity = isVisible ? '0' : '1';
      }
    });
  });

  // === SMOOTH SCROLL for anchor links ===
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // === NAV LINKS: fix internal navigation ===
  // Convert framer page links to anchor scrolls
  document.querySelectorAll('a[href^="./"]').forEach(link => {
    const href = link.getAttribute('href');
    // Map framer page links to section IDs
    if (href === './' || href === './index.html') {
      link.setAttribute('href', '#');
    }
  });

  // === CTA BUTTONS: scroll to signup form ===
  document.querySelectorAll('a').forEach(link => {
    const text = link.textContent?.trim().toLowerCase();
    if (text?.includes('get two free weeks') || text?.includes('start free trial') || text?.includes('free trial')) {
      link.addEventListener('click', e => {
        const signup = document.getElementById('sign-up') || document.querySelector('[data-framer-name="Sign up"]');
        if (signup) {
          e.preventDefault();
          signup.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  });

});
