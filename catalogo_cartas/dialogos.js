'use strict';
// Cierre de diálogos con aviso de cambios sin guardar. Un diálogo con "guarda" se cierra por
// la X, Esc o un clic fuera solo si no hay cambios; si los hay, aparece una barra con
// «Seguir editando», «Descartar cambios» y «Guardar».
(() => {
  const guards = new Map();

  function barOf(dialog) {
    let bar = dialog.querySelector(':scope > .discard-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'discard-bar';
    bar.setAttribute('role', 'alertdialog');
    bar.setAttribute('aria-label', 'Cambios sin guardar');
    bar.hidden = true;
    const text = document.createElement('p');
    text.textContent = 'Tienes cambios sin guardar.';
    const actions = document.createElement('div');
    for (const [act, label, cls] of [['keep', 'Seguir editando', 'secondary-button'], ['discard', 'Descartar cambios', 'secondary-button'], ['save', 'Guardar', 'primary-button']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.act = act;
      button.className = cls;
      button.textContent = label;
      actions.append(button);
    }
    bar.append(text, actions);
    bar.addEventListener('click', event => {
      const act = event.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const guard = guards.get(dialog.id);
      bar.hidden = true;
      if (act === 'discard') closeNow(dialog);
      if (act === 'save') guard?.save?.();
    });
    dialog.append(bar);
    return bar;
  }

  function closeNow(dialog) {
    guards.get(dialog.id)?.discard?.();
    const bar = dialog.querySelector(':scope > .discard-bar');
    if (bar) bar.hidden = true;
    if (dialog.open) dialog.close();
  }

  // Devuelve true si se ha cerrado; false si hay cambios (se muestra el aviso) o está ocupado.
  function request(dialog) {
    const guard = guards.get(dialog.id);
    if (guard?.busy?.()) return false;
    if (guard?.dirty?.()) {
      barOf(dialog).hidden = false;
      barOf(dialog).querySelector('[data-act=keep]').focus();
      return false;
    }
    closeNow(dialog);
    return true;
  }

  // Registra un diálogo: X (data-close), Esc y clic en el fondo pasan por request().
  function wire(dialog, guard = {}) {
    guards.set(dialog.id, guard);
    dialog.addEventListener('cancel', event => { event.preventDefault(); request(dialog); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) request(dialog);
    });
    dialog.querySelectorAll('[data-close]').forEach(button => {
      if (button.dataset.close === dialog.id) button.addEventListener('click', () => request(dialog));
    });
  }

  function setGuard(id, guard) { guards.set(id, { ...(guards.get(id) || {}), ...guard }); }

  window.tcgDialogos = { wire, request, closeNow, setGuard };
})();
