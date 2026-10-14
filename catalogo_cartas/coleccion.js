'use strict';
// Colecciones de personas: la propia (tcg_user_cards), Descubrir y la vista de solo lectura de
// la colección de otra persona. Solo se guardan referencias a cartas del índice; el nombre, la
// expansión y la imagen salen siempre del índice, nunca de texto escrito por otras personas.
(() => {
  const $ = id => document.getElementById(id), S = window.tcgSesion, app = window.catalogoApp;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const TIPOS = ['Agua', 'Dragón', 'Fuego', 'Hada', 'Incolora', 'Lucha', 'Metálica', 'Oscura', 'Planta', 'Psíquico', 'Rayo', 'Entrenador', 'Energía'];
  const CATEGORIAS = ['Pokémon', 'Entrenador', 'Energía'];
  const state = {kind:'main', viewed:null, mineCards:[], mineFor:'', pinned:false, available:true, key:'', index:null, loading:0};

  // ---- Índice de cartas e imágenes enlazadas ----
  function imageUrls(ref) {
    if (!ref) return {imagen:'', miniatura:''};
    if (ref[0] === 'd') { const url = `https://s3.ap-northeast-2.amazonaws.com/prod.daldagury.com/uploads/tcg-cards/resized/${encodeURIComponent(ref.slice(1))}_medium.webp`; return {imagen:url, miniatura:url}; }
    return {imagen:`https://assets.tcgdex.net/${ref}/high.webp`, miniatura:`https://assets.tcgdex.net/${ref}/low.webp`};
  }
  async function ensureIndex() {
    const refs = await window.tcgRegistry.prepare();
    if (state.index) return state.index;
    const map = new Map();
    for (const set of refs.expansiones) for (const card of set.cartas) map.set(set.idioma + '\u0000' + card.id, {card, set});
    state.index = map; return map;
  }
  function buildCard(row, found) {
    const {card, set} = found, images = imageUrls(card.i);
    const dalda = card.id.startsWith('dalda:');
    return {
      id:`u:${row.idioma}:${row.catalogo_id}`, idioma:row.idioma, catalogo_id:row.catalogo_id, cantidad:row.cantidad,
      nombre:card.nombre, numero:card.numero_completo || card.numero, expansion:set.nombre, codigo:set.codigo || '',
      tipo:row.tipo || 'Por confirmar', categoria:row.categoria || 'Por confirmar', rareza:card.rareza || 'Por confirmar', variante:'',
      imagen:images.imagen, imagen_miniatura:images.miniatura, imagen_origen:'referencia', pendiente:false,
      fuente_identidad:dalda ? 'https://daldagury.com/tcg/pokemon/card/' + encodeURIComponent(card.id.slice(6)) : `https://api.tcgdex.net/v2/${set.idioma_api}/cards/${encodeURIComponent(card.id)}`,
    };
  }
  async function buildCards(rows) {
    const index = await ensureIndex(), cards = [];
    for (const row of rows) { const found = index.get(row.idioma + '\u0000' + row.catalogo_id); if (found) cards.push(buildCard(row, found)); }
    return cards;
  }
  async function fetchRows(ownerId) {
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const {data, error} = await S.client.from('tcg_user_cards').select('idioma,catalogo_id,cantidad,tipo,categoria').eq('owner_id', ownerId).order('idioma').order('catalogo_id').range(start, start + 999);
      if (error) throw error;
      rows.push(...data); if (data.length < 1000) break;
    }
    return rows;
  }

  // ---- Barra de contexto y vista actual ----
  const homeKind = () => !S.user ? 'main' : (!S.profile ? 'pending' : (S.isAdmin || !S.v2 || !state.available ? 'main' : 'mine'));
  function setUrl(id) {
    try { const url = new URL(location.href); if (id) url.searchParams.set('u', id); else url.searchParams.delete('u'); history.replaceState(null, '', url); } catch (_) { /* sin historial */ }
  }
  function renderBar(text) {
    const bar = $('collection-bar'); bar.replaceChildren();
    const home = homeKind(), viewing = state.kind === 'user' || (state.kind === 'main' && state.viewed && home === 'mine');
    const empty = state.kind === 'mine' && state.mineCards.length === 0 && !state.loading;
    bar.hidden = !(viewing || empty || text);
    if (bar.hidden) return;
    const info = document.createElement('div'); info.className = 'bar-info';
    if (state.viewed && viewing) {
      const img = document.createElement('img'); img.className = 'bar-avatar'; img.alt = ''; img.src = S.avatarSrc(state.viewed.avatar); bar.append(img);
      const title = document.createElement('strong'); title.textContent = 'Colección de ' + state.viewed.username;
      const sub = document.createElement('span'); sub.textContent = `${state.viewed.cartas} ${state.viewed.cartas === 1 ? 'carta' : 'cartas'} · ${state.viewed.ejemplares} ${state.viewed.ejemplares === 1 ? 'ejemplar' : 'ejemplares'}`;
      info.append(title, sub);
    } else {
      const title = document.createElement('strong');
      title.textContent = text || 'Tu colección está vacía';
      info.append(title);
      if (!text) { const sub = document.createElement('span'); sub.textContent = 'Pulsa «Añadir carta» para guardar tus cartas y aparecer en Descubrir.'; info.append(sub); }
    }
    bar.append(info);
    if (viewing) {
      const back = document.createElement('button'); back.type = 'button'; back.className = 'secondary-button';
      back.textContent = home === 'mine' ? 'Volver a mi colección' : 'Volver al inicio';
      back.addEventListener('click', () => { state.pinned = false; goHome(); });
      bar.append(back);
    }
  }
  function changed() { renderBar(); document.dispatchEvent(new CustomEvent('tcg:vista')); }

  async function loadMine(keepFilters) {
    const token = ++state.loading; renderBar('Cargando tu colección…');
    try {
      const rows = await fetchRows(S.user.id);
      const cards = await buildCards(rows);
      if (token !== state.loading || state.kind !== 'mine') return;
      state.mineCards = cards; state.mineFor = S.user.id; app.setCards(cards, keepFilters);
    } catch (e) { S.status('No se pudo cargar tu colección. ' + S.errorText(e)); }
    finally { if (token === state.loading) state.loading = 0; changed(); }
  }
  function goHome() {
    const home = homeKind(); setUrl('');
    state.viewed = null;
    if (home === 'mine') { state.kind = 'mine'; state.mineCards = []; app.setCards([]); changed(); loadMine(false); }
    else { state.kind = 'main'; state.mineCards = []; app.useMain(); changed(); }
  }

  async function showUser(profile) {
    state.pinned = true; state.viewed = profile; setUrl(profile.id);
    if (profile.propietario) { state.kind = 'main'; app.useMain(); changed(); return; }
    state.kind = 'user'; app.setCards([]); renderBar('Cargando colección…');
    const token = ++state.loading;
    try {
      const cards = await buildCards(await fetchRows(profile.id));
      if (token !== state.loading || state.viewed?.id !== profile.id) return;
      state.viewed = {...profile, cartas:cards.length, ejemplares:cards.reduce((n, c) => n + c.cantidad, 0)};
      app.setCards(cards);
    } catch (e) { S.status('No se pudo cargar esa colección. ' + S.errorText(e)); }
    finally { if (token === state.loading) state.loading = 0; changed(); }
  }

  // ---- Guardar y quitar cartas propias ----
  const firstType = tipo => String(tipo || '').split(' / ')[0];
  async function saveMine(identity, quantity) {
    const row = {owner_id:S.user.id, idioma:identity.idioma, catalogo_id:identity.catalogo_id, cantidad:quantity,
      tipo:TIPOS.includes(firstType(identity.tipo)) ? firstType(identity.tipo) : null, categoria:CATEGORIAS.includes(identity.categoria) ? identity.categoria : null};
    if (!row.catalogo_id) throw new Error('Elige una carta del índice.');
    const {error} = await S.client.from('tcg_user_cards').upsert(row, {onConflict:'owner_id,idioma,catalogo_id'});
    if (error) throw error;
    const found = (await ensureIndex()).get(row.idioma + '\u0000' + row.catalogo_id);
    const card = found ? buildCard(row, found) : null;
    state.mineCards = [...state.mineCards.filter(c => c.id !== `u:${row.idioma}:${row.catalogo_id}`), ...(card ? [card] : [])];
    app.setCards(state.mineCards, true); changed();
    return card;
  }
  async function removeMine(card) {
    const {error} = await S.client.from('tcg_user_cards').delete().eq('owner_id', S.user.id).eq('idioma', card.idioma).eq('catalogo_id', card.catalogo_id);
    if (error) throw error;
    state.mineCards = state.mineCards.filter(c => c.id !== card.id);
    app.setCards(state.mineCards, true); changed();
  }

  // ---- Descubrir ----
  async function openDiscover() {
    const list = $('discover-list'); list.replaceChildren(); S.message('discover-status', 'Cargando…');
    if (!$('discover-dialog').open) $('discover-dialog').showModal();
    try {
      const {data, error} = await S.client.rpc('tcg_descubrir');
      if (error) throw error;
      S.message('discover-status', data.length ? '' : 'Todavía no hay colecciones. Sé la primera persona: inicia sesión y añade cartas.');
      for (const person of data) list.append(tile(person));
    } catch (e) { S.message('discover-status', 'No se pudo cargar Descubrir. ' + S.errorText(e), true); }
  }
  function tile(person) {
    const item = document.createElement('div'); item.className = 'discover-item'; item.setAttribute('role', 'listitem');
    const open = document.createElement('button'); open.type = 'button'; open.className = 'discover-open';
    const img = document.createElement('img'); img.alt = ''; img.src = S.avatarSrc(person.avatar);
    const text = document.createElement('span');
    const name = document.createElement('strong'); name.textContent = person.username + (person.propietario ? ' · colección principal' : '');
    const count = document.createElement('small'); count.textContent = `${person.cartas} ${person.cartas === 1 ? 'carta' : 'cartas'} · ${person.ejemplares} ${person.ejemplares === 1 ? 'ejemplar' : 'ejemplares'}${person.oculto ? ' · oculto' : ''}`;
    text.append(name, count); open.append(img, text);
    open.addEventListener('click', () => { window.tcgDialogos.closeNow($('discover-dialog')); showUser(person); });
    item.append(open);
    if (S.isAdmin && !person.propietario) {
      const hide = document.createElement('button'); hide.type = 'button'; hide.className = 'text-button'; hide.textContent = person.oculto ? 'Mostrar' : 'Ocultar';
      hide.addEventListener('click', async () => {
        hide.disabled = true;
        const {error} = await S.client.rpc('tcg_ocultar', {uid:person.id, ocultar:!person.oculto});
        if (error) { S.message('discover-status', S.errorText(error), true); hide.disabled = false; return; }
        openDiscover();
      });
      item.append(hide);
    }
    return item;
  }
  window.tcgDialogos.wire($('discover-dialog'));
  $('discover-button').addEventListener('click', openDiscover);

  // ---- Integración con la sesión ----
  function onSesion() {
    const key = [S.user?.id || '', S.profile ? 'p' : '', S.isAdmin ? 'a' : '', S.v2 ? '2' : ''].join('|');
    if (key === state.key) return;
    state.key = key;
    const home = homeKind();
    if (state.kind === 'mine' && (!S.user || home !== 'mine' || state.mineFor && state.mineFor !== S.user.id)) { goHome(); return; }
    if (state.kind === 'main' && home === 'mine' && !state.pinned) goHome();
    else renderBar();
    document.dispatchEvent(new CustomEvent('tcg:vista'));
  }
  document.addEventListener('tcg:sesion', onSesion);
  document.addEventListener('tcg:datos-borrados', () => { state.mineCards = []; if (state.kind === 'mine') { app.setCards([]); changed(); } });

  window.tcgColeccion = {
    get kind() { return state.kind; }, get viewed() { return state.viewed; },
    mineCards:() => state.mineCards.slice(), saveMine, removeMine, openDiscover, showUser, goHome,
  };

  // Detecta si el SQL v2 está aplicado (si no, se oculta Descubrir) y abre enlaces ?u=...
  (async () => {
    if (!S.client) { $('discover-button').hidden = true; return; }
    const probe = await S.client.rpc('tcg_descubrir');
    if (probe.error && /function|PGRST202|42883/i.test((probe.error.message || '') + (probe.error.code || ''))) { state.available = false; $('discover-button').hidden = true; onSesion(); return; }
    const shared = new URL(location.href).searchParams.get('u');
    if (shared && UUID.test(shared)) {
      const {data, error} = await S.client.rpc('tcg_perfil_publico', {uid:shared});
      const person = !error && data?.[0];
      if (person) { const {data:all} = await S.client.rpc('tcg_descubrir'); const stat = all?.find(p => p.id === person.id); showUser({...person, cartas:stat?.cartas || 0, ejemplares:stat?.ejemplares || 0}); }
      else S.status('Esa colección no existe o no es visible.');
    }
  })();
})();
