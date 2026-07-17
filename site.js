(() => {
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';

  if (!document.querySelector('.skip-link')) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<a class="skip-link" href="#main-content">Aller au contenu principal</a>'
    );
  }

  const headerTarget = document.getElementById('site-header');
  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="container nav">
          <a class="brand" href="index.html" aria-label="Accueil — Cabinet de cardiologie de la Docteure Lucia Cespedes-Ocampo">
            <span class="brand