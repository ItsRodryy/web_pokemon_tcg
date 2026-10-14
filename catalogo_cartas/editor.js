'use strict';
// Editor de cartas junto al detalle. El propietario edita su colección completa (foto, notas,
// encuadre); el resto de personas solo elige cartas existentes y su cantidad.
(() => {
  const $ = id => document.getElementById(id), form = $('card-form');
  const app = window.catalogoApp, S = window.tcgSesion;
  const state = {photo:null, photoUrl:null, crop:null, editing:null, photoVersion:0, mode:'owner', baseline:'', closeAfterSave:false};
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'pendiente';
  const isOwner = () => S.isAdmin;
  const canAdd = () => isOwner() ? app.showingMain : !!S.user && S.v2;
  const mine = () => window.tcgColeccion?.kind === 'mine';
  const message = (text, error = false) => S.message('editor-status', text, error);

  // Elementos que solo ve el propietario (foto, notas, categoría y tipo, selector de fichas).
  for (const id of ['edit-existing', 'card-category', 'card-type', 'card-photo', 'crop-controls']) {
    const el = $(id); (el.closest('label') || el).classList.add('solo-propietario');
  }
  form.elements.notas.closest('label').classList.add('solo-propietario');
  form.querySelectorAll('.field-help').forEach(p => { if (/foto|ejemplares|Cambiar/i.test(p.textContent)) p.classList.add('solo-propietario'); });

  // ---- Cambios sin guardar ----
  function snapshot() {
    const e = form.elements;
    return JSON.stringify([e.idioma.value, $('set-search').value, $('pokemon-search').value, $('card-number').value, e.categoria.value, e.tipo.value,
      e.cantidad.value, e.notas.value, state.photo?.file.name || '', state.crop && [state.crop.x, state.crop.y, state.crop.ancho]]);
  }
  const dirty = () => !$('editor-pane').hidden && snapshot() !== state.baseline;
  function releasePhoto() {
    state.photoVersion++; if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photo = null; state.photoUrl = null; state.crop = null;
    $('crop-controls').hidden = true; $('card-photo').value = ''; $('crop-image').removeAttribute('src');
  }
  window.tcgDialogos.setGuard('detail-dialog', {
    dirty, busy:() => S.busy,
    save:() => { state.closeAfterSave = true; form.requestSubmit(); },
    discard:() => { if (!$('editor-pane').hidden) { releasePhoto(); state.editing = null; } },
  });

  // ---- Abrir y rellenar ----
  const sources = () => isOwner() ? app.getMainData() : (window.tcgColeccion?.mineCards() || []);
  async function fillEditor(id) {
    releasePhoto(); form.reset(); state.editing = sources().find(c => c.id === id) || null;
    form.classList.toggle('user-mode', !isOwner());
    $('editor-eyebrow').textContent = isOwner() ? 'TU INVENTARIO' : 'TU COLECCIÓN';
    $('edit-existing').value = state.editing?.id || '';
    $('editor-title').textContent = state.editing ? 'Actualizar carta' : 'Añadir carta';
    $('remove-card').hidden = !(state.editing && !isOwner());
    if (state.editing) ['cantidad', 'notas'].forEach(k => { form.elements[k].value = state.editing[k] ?? ''; });
    else form.elements.cantidad.value = '1';
    message(''); $('save-card').disabled = true;
    try { await window.tcgRegistry.prepare(); window.tcgRegistry.setExisting(state.editing); }
    catch (e) { message(S.errorText(e), true); return; }
    $('save-card').disabled = false; state.baseline = snapshot();
  }
  async function openEditor(id = '') {
    if (!canAdd()) return;
    if (isOwner()) {
      const select = $('edit-existing'); select.replaceChildren(new Option('Nueva carta', ''));
      app.getMainData().slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).forEach(c => select.add(new Option(`${c.nombre} · ${c.numero} · ${c.idioma}`, c.id)));
    }
    const withDetail = !!id && $('detail-dialog').open;
    app.setPanes({detail:withDetail, editor:true}); app.showDialog();
    await fillEditor(id);
    if (withDetail) $('editor-pane').scrollIntoView({block:'nearest'});
  }
  $('add-card').addEventListener('click', () => openEditor());
  $('edit-existing').addEventListener('change', () => fillEditor($('edit-existing').value));

  // ---- Foto y encuadre (propietario) ----
  function updateCrop() {
    if (!state.photo) return;
    const {width:W, height:H} = state.photo, ratio = 1104 / 1504, zoom = Number($('crop-zoom').value);
    const w = Math.min(W, H * ratio) / zoom, h = w / ratio;
    state.crop = {x:(W - w) * Number($('crop-x').value) / 100, y:(H - h) * Number($('crop-y').value) / 100, ancho:w, alto:h, ancho_original:W, alto_original:H};
    const r = state.crop;
    $('crop-image').style.cssText = `width:${100 * W / w}%;height:${100 * H / h}%;left:${-100 * r.x / w}%;top:${-100 * r.y / h}%;`;
  }
  ['crop-zoom', 'crop-x', 'crop-y'].forEach(id => $(id).addEventListener('input', updateCrop));
  $('card-photo').addEventListener('change', async () => {
    const file = $('card-photo').files[0]; if (!file) { releasePhoto(); return; }
    releasePhoto();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) { message('Usa JPG, PNG o WebP de hasta 15 MB. Para HEIC, exporta la foto como JPEG.', true); return; }
    const url = URL.createObjectURL(file), img = new Image(), version = state.photoVersion; img.src = url;
    try {
      await img.decode(); if (version !== state.photoVersion) { URL.revokeObjectURL(url); return; }
      state.photo = {file, width:img.naturalWidth, height:img.naturalHeight}; state.photoUrl = url; $('crop-image').src = url; $('crop-controls').hidden = false;
      $('crop-zoom').value = 1; $('crop-x').value = 50; $('crop-y').value = 50; updateCrop(); message('');
    } catch (_) { URL.revokeObjectURL(url); message('No se pudo abrir la fotografía.', true); }
  });

  // ---- Guardar ----
  const number = v => String(v || '').split('/')[0].replace(/^0+(?=\d)/, '').toLowerCase();
  function finish(card) {
    const reopen = !!card && !$('detail-pane').hidden;
    if (reopen) { releasePhoto(); app.setPanes({detail:true, editor:false}); app.openDetail(card.id); }
    else window.tcgDialogos.closeNow($('detail-dialog'));
  }
  async function submitOwner(identity, quantity) {
    const values = {cantidad:form.elements.cantidad.value.trim(), notas:form.elements.notas.value.trim()};
    if (!state.editing && !state.photo) { message('Añade una fotografía de la nueva carta.', true); return; }
    const same = app.getMainData().find(c => c.id !== state.editing?.id && c.idioma === identity.idioma && ((c.catalogo_id && c.catalogo_id === identity.catalogo_id) || (String(c.codigo).toLowerCase() === String(identity.codigo).toLowerCase() && number(c.numero) === number(identity.numero) && !!identity.codigo)));
    if (same) { message('Esta carta ya tiene ficha. Selecciónala arriba para cambiar su cantidad o fotografía.', true); return; }
    const card = {...identity, ...values, id:state.editing?.id || 'c_' + crypto.randomUUID().replaceAll('-', '_'), cantidad:quantity};
    if (!state.editing) { card.pendiente = false; card.cantidad_provisional = false; card.motivo_pendiente = ''; }
    card.ids_unidades = state.editing?.ids_unidades || [card.id]; card.rareza ||= 'Por confirmar'; card.tipo ||= 'Por confirmar';
    if (!card.pendiente) card.motivo_pendiente = '';
    card.estado ||= 'Frontal fotografiado; reverso no disponible; estado global pendiente.';
    S.busy = true; $('save-card').disabled = true; message('Guardando carta…'); let uploaded = null;
    try {
      if (state.photo) {
        const ext = {'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp'}[state.photo.file.type];
        uploaded = `${S.user.id}/${slug(card.idioma)}/${Date.now()}_${slug(card.nombre)}_${slug(card.codigo)}_${slug(card.numero)}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const {error} = await S.client.storage.from(S.config.bucket).upload(uploaded, state.photo.file, {contentType:state.photo.file.type, upsert:false}); if (error) throw error;
        card.imagen = S.client.storage.from(S.config.bucket).getPublicUrl(uploaded).data.publicUrl;
        Object.assign(card, {encuadre:{...state.crop}, imagen_origen:'foto_propia', imagen_fuente:state.photo.file.name, imagen_url:null, imagen_faltante:false, recorte_metodo:'encuadre_visual_sin_modificar_original'}); delete card.contorno_normalizado;
      }
      if (!S.validImage(card.imagen)) throw new Error('La fotografía no tiene una dirección válida.');
      const {error} = await S.client.from('tcg_cards').upsert({id:card.id, datos:card}, {onConflict:'id'}); if (error) throw error;
      uploaded = null;
      app.replaceRemote([...app.getMainData(), card]); finish(card);
      try { await S.loadCards(); } catch (_) { S.status('Carta guardada. No se pudo recargar el resto de la colección; puedes actualizar la página más tarde.'); }
    } catch (e) {
      if (uploaded) {
        const removed = await S.client.storage.from(S.config.bucket).remove([uploaded]);
        message(removed.error ? 'No se guardó la ficha; la foto subida necesita revisarse. ' + S.errorText(e) : S.errorText(e), true);
      } else message(S.errorText(e), true);
    } finally { S.busy = false; $('save-card').disabled = false; }
  }
  async function submitUser(identity, quantity) {
    const coleccion = window.tcgColeccion;
    if (!state.editing && coleccion.mineCards().some(c => c.idioma === identity.idioma && c.catalogo_id === identity.catalogo_id)) {
      message('Ya tienes esta carta. Ábrela en tu colección para cambiar su cantidad.', true); return;
    }
    S.busy = true; $('save-card').disabled = true; message('Guardando…');
    try { const saved = await coleccion.saveMine(identity, quantity); finish(saved); }
    catch (e) { message(S.errorText(e), true); }
    finally { S.busy = false; $('save-card').disabled = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!canAdd() || S.busy) { state.closeAfterSave = false; return; }
    let identity;
    try { identity = window.tcgRegistry.getCard({lenient:!isOwner()}); } catch (e) { state.closeAfterSave = false; message(S.errorText(e), true); return; }
    const quantity = Number(form.elements.cantidad.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) { state.closeAfterSave = false; message('La cantidad debe ser un número entero entre 1 y 9999.', true); return; }
    await (isOwner() ? submitOwner(identity, quantity) : submitUser(identity, quantity));
    state.closeAfterSave = false;
  });
  $('remove-card').addEventListener('click', async () => {
    const card = state.editing; if (!card || S.busy || isOwner()) return;
    S.busy = true; message('Quitando…');
    try { await window.tcgColeccion.removeMine(card); finish(null); }
    catch (e) { message(S.errorText(e), true); } finally { S.busy = false; }
  });

  // ---- Integración con la sesión y la colección mostrada ----
  const refreshButton = () => { $('add-card').hidden = !canAdd(); };
  document.addEventListener('tcg:sesion', refreshButton); document.addEventListener('tcg:vista', refreshButton);
  Object.assign(window.tcgAccount, {
    openEditor,
    canEdit:() => isOwner() ? app.showingMain : (!!S.user && S.v2 && mine()),
  });
  refreshButton();
})();
