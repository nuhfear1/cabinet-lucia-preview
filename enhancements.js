(() => {
  try {
    if (document.documentElement.dataset.enhanced) return;
    document.documentElement.dataset.enhanced = 'true';
    document.querySelectorAll('.field').forEach((field) => {
      if (field.querySelector('select')) field.classList.add('field-float');
    });
    document.addEventListener('change', (event) => {
      if (!event.target.matches('select')) return;
      const field = event.target.closest('.field');
      if (field?.animate) {
        field.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }],
          { duration: 260, easing: 'ease-out' }
        );
      }
    });
  } catch (error) {
    console.warn('Optional enhancements disabled:', error);
  }
})();
