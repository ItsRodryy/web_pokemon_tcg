'use strict';
// Sesión con Google (Supabase), perfil (nombre, avatar y visibilidad), cierre de sesión y
// sincronización de la colección inicial. La edición de cartas vive en editor.js y las
// colecciones de otras personas en coleccion.js.
(() => {
  const $ = id => document.getElementById(id), config = window.CATALOGO_CONFIG || {};
  const app = window.catalogoApp, initial = window.CATALOGO_DATA || [];
  const state = {client:null, user:null, profile:null, isAdmin:false, adminError:'', v2:true, busy:false, authVersion:0, signingIn:false, signingOut:false, newProfile:false, closeAfterSave:false};
  const authStorageKey = config.supabaseUrl ? 'sb-' + new URL(config.supabaseUrl).hostname.split('.')[0] + '-auth-token' : '';
  const oauthReturn = new URL(location.href).searchParams.has('code') || location.hash.includes('error=');
  const AVATARS = [1, 2, 3, 4, 5, 6, 7, 8]
    .map(n => ({id:'a' + n, nombre:'Avatar ' + n, src:`catalogo_cartas/avatares/a${n}.png`}));
  const message = (id, text, error = false) => { const el = $(id); el.textContent = text; el.dataset.error = String(error); };
  const status = text => { $('connection-status').hidden = !text; $('connection-status').textContent = text || ''; };
  const errorText = e => e?.code === '23505' ? 'Esta carta ya existe. Selecciónala arriba para actualizar su cantidad o su foto.' : e?.message || 'No se pudo completar. Inténtalo de nuevo.';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const withTimeout = (promise, ms, fallback) => Promise.race([promise, sleep(ms).then(() => fallback)]);
  const avatarSrc = id => (AVATARS.find(a => a.id === id) || AVATARS[0]).src;

  function validImage(src) {
    if (typeof src !== 'string') return false;
    if (/^imagenes_cartas\/(japones|español|coreano|pendientes)\/[a-z0-9_]+\.(jpg|jpeg|png|webp)$/.test(src)) return true;
    try { const u = new URL(src), base = new URL(config.supabaseUrl); return u.protocol === 'https:' && u.origin === base.origin && u.pathname.startsWith('/storage/v1/object/public/' + config.bucket + '/'); } catch (_) { return false; }
  }

  // ---- Cabecera y cuenta ----
  function accountView() {
    const name = state.user ? (state.profile?.username || state.user.user_metadata?.full_name || 'Entrenador') : 'rodrytela';
    $('brand-name').textContent = name; $('brand-name').title = name;
    $('account-button').replaceChildren();
    if (state.user) {
      const img = document.createElement('img'); img.className = 'account-avatar'; img.alt = ''; img.src = avatarSrc(state.profile?.avatar);
      $('account-button').append(img, document.createTextNode('Tu cuenta'));
    } else $('account-button').textContent = 'Entrar con Google';
    $('header-sign-out').hidden = !state.user;
    $('import-catalogue').hidden = !state.isAdmin;
    $('delete-data').hidden = !state.user || !state.v2;
    $('profile-form').classList.toggle('sin-v2', !state.v2);
    $('account-email').textContent = state.user?.email || '';
    $('account-diagnostic').textContent = !state.user ? '' : `Sesión: ${state.user.email || 'sin correo'} · Administrador: ${state.isAdmin ? 'sí' : 'no'}${state.adminError ? ' (' + state.adminError + ')' : ''}`;
    document.title = name + ' · Pokémon TCG';
    document.dispatchEvent(new CustomEvent('tcg:sesion'));
  }

  async function loadCards() {
    if (!state.client) return;
    const cards = [];
    for (let start = 0; ; start += 1000) {
      const {data, error} = await state.client.from('tcg_cards').select('datos').order('id').range(start, start + 999);
      if (error) throw error;
      for (const row of data) {
        const c = row.datos;
        if (c && typeof c.id === 'string' && ['japones','español','coreano'].includes(c.idioma) && Number.isInteger(c.cantidad) && c.cantidad > 0 && validImage(c.imagen)) cards.push(c);
      }
      if (data.length < 1000) break;
    }
    app.replaceRemote(cards); status('');
  }

  // Lee el perfil con las columnas nuevas; si el SQL v2 aún no está aplicado, usa solo el nombre.
  async function readProfile(userId) {
    const extended = await state.client.from('tcg_profiles').select('id,username,avatar,visible').eq('id', userId).maybeSingle();
    if (!extended.error) { state.v2 = true; return extended.data; }
    if (!/avatar|visible|column/i.test(extended.error.message || '') && extended.error.code !== '42703') throw extended.error;
    state.v2 = false;
    const base = await state.client.from('tcg_profiles').select('id,username').eq('id', userId).maybeSingle();
    if (base.error) throw base.error;
    return base.data && {...base.data, avatar:'a1', visible:true};
  }
  const defaultName = () => 'Entrenador' + String(Math.floor(1000 + Math.random() * 9000));

  async function loadProfile(user, version) {
    let profile = await readProfile(user.id);
    if (!profile) {
      const created = await state.client.from('tcg_profiles').upsert({id:user.id, username:defaultName()}, {onConflict:'id', ignoreDuplicates:true});
      if (created.error) throw created.error;
      profile = await readProfile(user.id); state.newProfile = true;
    }
    const admin = await state.client.rpc('tcg_is_admin');
    if (version !== state.authVersion) return;
    state.profile = profile; state.isAdmin = admin.data === true && !admin.error;
    state.adminError = admin.error ? 'no se pudo comprobar: ' + errorText(admin.error) : (state.isAdmin ? '' : 'esta cuenta no figura como propietaria');
    accountView();
    if (state.newProfile) { state.newProfile = false; openAccount(); }
  }

  async function signedUser() {
    if (state.signingOut) return;
    const version = ++state.authVersion;
    const cached = await state.client.auth.getSession();
    if (version !== state.authVersion || state.signingOut) return;
    const cachedUser = cached.data?.session?.user || null;
    if (cachedUser && !state.user) { state.user = cachedUser; state.profile = null; state.isAdmin = false; accountView(); }
    const {data, error} = await withTimeout(state.client.auth.getUser(), 10000, {data:{}, error:{message:'El servicio tarda demasiado en responder.'}});
    if (version !== state.authVersion || state.signingOut) return;
    if (error && cachedUser) {
      state.isAdmin = false; state.adminError = 'no se pudo comprobar el acceso'; accountView();
      status('Tu sesión está guardada, pero no se pudo comprobar el acceso. ' + errorText(error) + ' Puedes cerrar sesión desde la cabecera.'); return;
    }
    const next = error ? null : data.user, same = !!next && state.user?.id === next.id;
    state.user = next; if (!same) { state.profile = null; state.isAdmin = false; } accountView();
    if (error && oauthReturn) status('No se pudo recuperar tu sesión. ' + errorText(error) + ' Vuelve a pulsar Entrar con Google.');
    if (!state.user) return;
    try { await loadProfile(state.user, version); }
    catch (e) { if (version === state.authVersion) { state.adminError = errorText(e); accountView(); message('profile-status', 'No se pudo cargar tu perfil. ' + errorText(e), true); } }
  }

  async function signIn() {
    if (state.signingIn) return;
    if (!state.client) { status('El acceso con Google todavía se está preparando.'); return; }
    if (!['https:', 'http:'].includes(location.protocol)) { status('Para iniciar sesión abre la versión publicada del catálogo.'); return; }
    const redirect = config.redirectUrl || new URL('catalogo_cartas.html', location.href).href;
    state.signingIn = true; $('account-button').disabled = true;
    try {
      const {error} = await state.client.auth.signInWithOAuth({provider:'google', options:{redirectTo:redirect, queryParams:{prompt:'select_account'}}});
      if (error) throw error;
    } catch (error) { state.signingIn = false; $('account-button').disabled = false; status('No se pudo entrar con Google. ' + errorText(error)); }
  }
  window.addEventListener('pageshow', () => { state.signingIn = false; $('account-button').disabled = false; });

  // ---- Diálogo de cuenta: nombre, avatar y visibilidad ----
  let chosenAvatar = 'a1';
  function renderAvatars() {
    const box = $('avatar-options'); box.replaceChildren();
    for (const avatar of AVATARS) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'avatar-option'; button.setAttribute('role', 'radio'); button.dataset.avatar = avatar.id;
      button.setAttribute('aria-checked', String(avatar.id === chosenAvatar)); button.setAttribute('aria-label', avatar.nombre);
      const img = document.createElement('img'); img.src = avatar.src; img.alt = ''; button.append(img);
      button.addEventListener('click', () => { chosenAvatar = avatar.id; renderAvatars(); });
      box.append(button);
    }
  }
  const savedProfile = () => ({username:state.profile?.username || state.user?.user_metadata?.full_name || '', avatar:state.profile?.avatar || 'a1', visible:state.profile?.visible !== false});
  const formProfile = () => ({username:$('username').value.trim().replace(/\s+/g, ' '), avatar:chosenAvatar, visible:$('profile-visible').checked});
  const profileDirty = () => { const a = savedProfile(), b = formProfile(); return a.username !== b.username || (state.v2 && (a.avatar !== b.avatar || a.visible !== b.visible)); };
  function openAccount() {
    const saved = savedProfile(); chosenAvatar = saved.avatar;
    $('username').value = saved.username; $('profile-visible').checked = saved.visible;
    renderAvatars(); message('profile-status', '');
    if (!$('account-dialog').open) $('account-dialog').showModal();
  }
  $('account-button').addEventListener('click', () => { if (!state.user) signIn(); else openAccount(); });
  window.tcgDialogos.wire($('account-dialog'), {dirty:profileDirty, busy:() => state.busy, save:() => { state.closeAfterSave = true; $('profile-form').requestSubmit(); }});

  $('profile-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!state.user || state.busy) return;
    const next = formProfile();
    if (!next.username || Array.from(next.username).length > 40) { state.closeAfterSave = false; message('profile-status', 'Escribe un nombre de entre 1 y 40 caracteres.', true); return; }
    state.busy = true; const button = event.submitter || event.currentTarget.querySelector('[type="submit"]'); button.disabled = true; message('profile-status', 'Guardando…');
    try {
      const userId = state.user.id, values = state.v2 ? next : {username:next.username};
      const {data, error} = await state.client.from('tcg_profiles').update(values).eq('id', userId).select(state.v2 ? 'id,username,avatar,visible' : 'id,username').single();
      if (error) throw error;
      if (state.user?.id === userId) {
        state.profile = state.v2 ? data : {...data, avatar:'a1', visible:true}; accountView(); message('profile-status', 'Perfil guardado.');
        if (state.closeAfterSave) window.tcgDialogos.closeNow($('account-dialog'));
      }
    } catch (e) { message('profile-status', errorText(e), true); }
    finally { state.closeAfterSave = false; state.busy = false; button.disabled = false; }
  });

  // ---- Cierre de sesión: siempre disponible, nunca se queda esperando al servicio ----
  function forgetLocalSession() {
    // Salida local explícita incluso si el servicio no responde. Solo claves de autenticación
    // de este proyecto; nunca se borran otros datos ni cuentas.
    for (const key of [authStorageKey, authStorageKey + '-code-verifier', authStorageKey + '-user']) { try { localStorage.removeItem(key); } catch (_) { /* almacenamiento bloqueado */ } }
  }
  async function signOut() {
    if (state.signingOut || !state.client) return;
    state.signingOut = true; state.authVersion++; state.isAdmin = false; accountView();
    $('sign-out').disabled = true; $('header-sign-out').disabled = true;
    // Máximo 3 s esperando al servicio; pasado ese tiempo se sale en local y se recarga.
    const done = await withTimeout(state.client.auth.signOut({scope:'local'}).then(r => !r.error, () => false), 3000, false);
    if (!done) { await withTimeout(state.client.auth.stopAutoRefresh().catch(() => {}), 1000); forgetLocalSession(); }
    state.authVersion++; state.user = null; state.profile = null; state.isAdmin = false; state.adminError = ''; state.busy = false; accountView();
    for (const id of ['account-dialog', 'detail-dialog', 'discover-dialog']) { if ($(id).open) window.tcgDialogos.closeNow($(id)); }
    status('Has cerrado tu sesión en esta web.'); message('profile-status', '');
    state.signingOut = false; $('sign-out').disabled = false; $('header-sign-out').disabled = false;
    // Recargar garantiza que el cliente no conserve en memoria la sesión borrada.
    if (!done) location.reload();
  }
  $('sign-out').addEventListener('click', signOut); $('header-sign-out').addEventListener('click', signOut);

  // ---- Borrar mis datos (perfil y cartas propias) ----
  let deleteTimer = 0;
  $('delete-data').addEventListener('click', async () => {
    const button = $('delete-data');
    if (button.dataset.confirm !== 'si') {
      button.dataset.confirm = 'si'; button.textContent = 'Confirmar: borrar perfil y cartas';
      deleteTimer = setTimeout(() => { button.dataset.confirm = ''; button.textContent = 'Borrar mis datos'; }, 6000); return;
    }
    clearTimeout(deleteTimer); button.dataset.confirm = ''; button.textContent = 'Borrar mis datos';
    if (!state.user || state.busy) return;
    state.busy = true; message('profile-status', 'Borrando…');
    try {
      const {error} = await state.client.rpc('tcg_borrar_mis_datos'); if (error) throw error;
      state.profile = null; await loadProfile(state.user, state.authVersion);
      message('profile-status', 'Tus cartas y tu perfil se han borrado. Se ha creado un perfil nuevo vacío.');
      document.dispatchEvent(new CustomEvent('tcg:datos-borrados'));
    } catch (e) { message('profile-status', errorText(e), true); } finally { state.busy = false; }
  });

  // ---- Sincronizar las cartas iniciales (solo propietario) ----
  $('import-catalogue').addEventListener('click', async () => {
    if (!state.isAdmin || state.busy) return;
    state.busy = true; $('import-catalogue').disabled = true; message('profile-status', 'Sincronizando las cartas iniciales…');
    try {
      const {error} = await state.client.from('tcg_cards').upsert(initial.map(c => ({id:c.id, datos:c})), {onConflict:'id', ignoreDuplicates:true});
      if (error) throw error;
      await loadCards(); message('profile-status', 'Colección inicial sincronizada. Las fichas ya guardadas se han conservado.');
    } catch (e) { message('profile-status', errorText(e), true); } finally { state.busy = false; $('import-catalogue').disabled = false; }
  });

  // API para editor.js y coleccion.js
  window.tcgSesion = {
    config, get client() { return state.client; }, get user() { return state.user; }, get profile() { return state.profile; },
    get isAdmin() { return state.isAdmin; }, get v2() { return state.v2; },
    get busy() { return state.busy; }, set busy(value) { state.busy = value; },
    message, status, errorText, validImage, loadCards, avatars:AVATARS, avatarSrc,
    refresh:() => signedUser().catch(() => {}),
  };
  window.tcgAccount = {
    get isAdmin() { return state.isAdmin; }, get user() { return state.user; }, get profile() { return state.profile; },
    canEdit:() => false, openEditor() {}, reload:loadCards,
  };
  accountView();
  if (config.supabaseUrl && config.supabaseKey && window.supabase) {
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {auth:{storageKey:authStorageKey, flowType:'pkce', detectSessionInUrl:true, persistSession:true, autoRefreshToken:true}});
    state.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        state.authVersion++; state.user = null; state.profile = null; state.isAdmin = false; accountView();
        for (const id of ['account-dialog', 'discover-dialog']) { if ($(id).open) window.tcgDialogos.closeNow($(id)); }
        return;
      }
      if (session?.user && !state.user) { state.user = session.user; accountView(); }
      setTimeout(() => signedUser().catch(() => {}), 0);
    });
    state.client.auth.initialize().then(({error}) => {
      if (error) status('No se pudo completar el inicio de sesión. ' + errorText(error) + ' Vuelve a pulsar Entrar con Google.');
      else signedUser().catch(() => {});
    });
    loadCards().catch(() => status('No se pudo actualizar la colección. Mostrando las cartas guardadas.'));
  }
})();
