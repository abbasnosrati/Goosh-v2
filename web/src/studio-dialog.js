// Reuse the project's native-dialog and inline status patterns.
// These helpers intentionally avoid browser alert()/confirm() UI.
export function showStudioMessage(host, message, tone = 'info') {
  if (!host) return;
  host.textContent = message || '';
  host.dataset.tone = tone;
  host.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  host.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
}

export function confirmStudioAction({ title, description, confirmLabel,
  cancelLabel, destructive = false } = {}) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'etude-delete-dialog studio-confirm-dialog';
    dialog.setAttribute('aria-label', title);
    const heading = document.createElement('h2');
    heading.textContent = title;
    const body = document.createElement('p');
    body.textContent = description;
    const controls = document.createElement('div');
    controls.className = 'etude-delete-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'etude-delete-cancel';
    cancel.textContent = cancelLabel;
    const proceed = document.createElement('button');
    proceed.type = 'button';
    proceed.className = destructive ? 'etude-delete-confirm' : 'primary';
    proceed.textContent = confirmLabel;
    controls.append(cancel, proceed);
    dialog.append(heading, body, controls);
    document.body.append(dialog);
    let accepted = false;
    cancel.onclick = () => dialog.close();
    proceed.onclick = () => { accepted = true; dialog.close(); };
    const routeClose = () => { if (dialog.open) dialog.close(); };
    window.addEventListener('popstate', routeClose);
    window.addEventListener('hashchange', routeClose);
    dialog.onclose = () => {
      window.removeEventListener('popstate', routeClose);
      window.removeEventListener('hashchange', routeClose);
      dialog.remove();
      resolve(accepted);
    };
    dialog.showModal();
    cancel.focus();
  });
}
