'use strict';
// Catálogo: filtros, cuadrícula/lista y detalle. Muestra la colección principal (datos iniciales
// más las fichas guardadas) o, en modo lectura, la colección de otra persona (setCards).
(() => {
  const initial = window.CATALOGO_DATA || [];
  let mainData = initial.slice();   // colección principal del propietario
  let data = mainData;              // colección que se está mostrando
  let current = 'main';             // 'main' o 'other'
  const collator = new Intl.Collator('es', {numeric:true,sensitivity:'base'});
  const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const languageName = value => ({'español':'Español',japones:'Japonés',coreano:'Coreano'}[value] || value);
  const languageCode = value => ({'español':'ES',japones:'JP',coreano:'KR'}[value] || '—');
  const rarityNames = {AR:'Ilustración rara · AR',SR:'Súper rara · SR',RR:'Doble rara · RR',RRR:'Triple rara · RRR',C:'Común',U:'Poco común',R:'Rara',pendiente:'Por confirmar',None:'Sin rareza indicada',Ninguno:'Sin rareza indicada',promo:'Promo',PROMO:'Promo',
    // TCGdex devuelve algunas rarezas en ingles incluso en su API en espanol.
    Common:'Común',Uncommon:'Poco común',Rare:'Rara','Holo Rare':'Holo Rara','Double rare':'Rara Doble','Ultra Rare':'Ultra Rara','Illustration rare':'Rara Ilustración','Special illustration rare':'Rara Ilustración Especial','Hyper rare':'Rara Híper','Secret Rare':'Rara Secreta'};
  const rarityName = value => rarityNames[value] || value || 'Por confirmar';
  // Sinonimos antiguos; el vocabulario comun es el de TCGdex en espanol.
  const typeAliases = {Incoloro:'Incolora',Oscuridad:'Oscura','Metálico':'Metálica'};
  const normalizeCard = c => typeAliases[c.tipo] ? {...c,tipo:typeAliases[c.tipo]} : c;
  const controls = ['search','sort','type','expansion','rarity','pending'];
  let language = '', visible = [];

  function compare(mode) {
    const text = (a, b) => collator.compare(a || '', b || '');
    if(mode==='name_desc') return (a,b)=>text(b.nombre,a.nombre) || text(a.numero,b.numero);
    if(mode==='type') return (a,b)=>text(a.tipo,b.tipo) || text(a.nombre,b.nombre);
    if(mode==='expansion') return (a,b)=>text(a.expansion,b.expansion) || text(a.numero,b.numero);
    if(mode==='rarity') return (a,b)=>text(rarityName(a.rareza),rarityName(b.rareza)) || text(a.nombre,b.nombre);
    if(mode==='quantity') return (a,b)=>b.cantidad-a.cantidad || text(a.nombre,b.nombre);
    if(mode==='number') return (a,b)=>text(a.numero,b.numero) || text(a.nombre,b.nombre);
    return (a,b)=>text(a.nombre,b.nombre) || text(a.numero,b.numero);
  }
  function populate(id,values,label=v=>v) {
    const select=$(id),selected=select.value;
    while(select.options.length>1)select.remove(1);
    [...new Set(values)].sort(collator.compare).forEach(value=>{
      const option=document.createElement('option');option.value=value;option.textContent=label(value);select.append(option);
    });
    select.value=[...select.options].some(o=>o.value===selected)?selected:'';
  }
  function refreshCounts() {
    populate('type',data.map(c=>c.tipo));populate('expansion',data.map(c=>c.expansion));populate('rarity',data.map(c=>rarityName(c.rareza)));
    $('total-units').innerHTML=data.reduce((n,c)=>n+c.cantidad,0)+'<small>ejemplares</small>';
    $('total-distinct').textContent=data.length+' cartas';
    document.querySelectorAll('[data-language]').forEach(b=>{b.querySelector('span:last-child').textContent=data.filter(c=>!b.dataset.language || c.idioma===b.dataset.language).length;});
  }
  document.querySelectorAll('[data-language]').forEach(button=>{
    button.addEventListener('click',()=>{
      language=button.dataset.language;
      document.querySelectorAll('[data-language]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
      render();
    });
  });

  // Los escaneos llevan esquinas redondeadas; las fotos propias se muestran tal cual.
  const isScan = c => c.imagen_origen !== 'foto_propia';
  function imageOrigin(c){
    if(c.imagen_faltante) return 'Referencia provisional · falta la imagen exacta';
    return {catalogo:'Imagen de catálogo',referencia:'Escaneo de referencia',referencia_web:'Referencia web'}[c.imagen_origen] || 'Foto propia';
  }
  function missingPicture(c){return c.imagen_faltante?'<div class="missing-picture"><span>Falta la foto<br>de esta edición</span></div>':'';}
  function noImage(){return '<div class="no-image"><span>Sin imagen<br>disponible</span></div>';}
  function thumbnail(c) {
    if(!c.imagen) return noImage();
    const r=c.encuadre;
    const crop=r && [r.x,r.y,r.ancho,r.alto,r.ancho_original,r.alto_original].every(Number.isFinite) && r.ancho>0 && r.alto>0;
    const style=crop?` style="width:${100*r.ancho_original/r.ancho}%;height:${100*r.alto_original/r.alto}%;left:${-100*r.x/r.ancho}%;top:${-100*r.y/r.alto}%;"`:'';
    const size=crop?`${r.ancho_original}" height="${r.alto_original}`:'1104" height="1504';
    return `<img${crop?' class="cropped-photo"':''}${style} src="${escapeHtml(c.imagen_miniatura||c.imagen)}" alt="${escapeHtml(c.nombre)} ${escapeHtml(c.numero)} · ${languageName(c.idioma)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="${size}">${missingPicture(c)}`;
  }
  function cardHtml(c) {
    const badge=c.cantidad>1?`<span class="quantity-badge" title="${c.cantidad} ejemplares">×${c.cantidad}</span>`:'';
    const tail=c.pendiente?'<span class="pending-tag">Por confirmar</span>':'<span class="detail-hint" aria-hidden="true">↗</span>';
    const label=`Ver ${escapeHtml(c.nombre)}, ${escapeHtml(c.numero)}, ${languageName(c.idioma)}`;
    return `<article class="card" data-id="${escapeHtml(c.id)}"><button type="button" class="card-open" data-open="${escapeHtml(c.id)}" aria-label="${label}"><div class="card-picture${isScan(c)?' scan':''}">${thumbnail(c)}${badge}</div><div class="card-info"><div class="card-meta"><span class="language-mark ${languageCode(c.idioma).toLowerCase()}">${languageCode(c.idioma)}</span><span>${escapeHtml(c.numero)}</span><span class="dot"></span><span>${escapeHtml(c.tipo)}</span></div><h3 class="card-name">${escapeHtml(c.nombre)}</h3><div class="card-set" title="${escapeHtml(c.expansion)}">${escapeHtml(c.expansion)}</div><div class="card-bottom"><span class="card-rarity">${escapeHtml(rarityName(c.rareza))}</span>${tail}</div></div></button></article>`;
  }
  function render() {
    const query=normalize($('search').value).trim().split(/\s+/).filter(Boolean),type=$('type').value,expansion=$('expansion').value,rarity=$('rarity').value,pending=$('pending').value;
    visible=data.filter(c=>{
      if(language && c.idioma!==language || type && c.tipo!==type || expansion && c.expansion!==expansion || rarity && rarityName(c.rareza)!==rarity) return false;
      if(pending==='identity' && !c.pendiente || pending==='quantity' && !c.cantidad_provisional) return false;
      const haystack=normalize([c.nombre,c.nombre_original,c.numero,c.expansion,c.codigo,c.tipo,c.categoria,c.subcategoria,c.variante,c.id,languageName(c.idioma),rarityName(c.rareza)].join(' '));
      return query.every(word=>haystack.includes(word));
    }).sort(compare($('sort').value));
    $('result-count').textContent=visible.length;
    const units=visible.reduce((n,c)=>n+c.cantidad,0);
    $('visible-description').textContent=`${visible.length} ${visible.length===1?'carta':'cartas'} · ${units} ${units===1?'ejemplar':'ejemplares'}`;
    $('cards').innerHTML=visible.map(cardHtml).join('');
    $('empty').hidden=visible.length!==0;
  }
  function reset() {
    language='';controls.forEach(id=>{$(id).value=id==='sort'?'name_asc':'';});
    document.querySelectorAll('[data-language]').forEach(b=>{const active=!b.dataset.language;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    render();
  }

  // Forma de mostrar las cartas: se recuerda en este navegador.
  function setView(view,save=true){
    const list=view==='list';
    $('cards').classList.toggle('view-list',list);
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===(list?'list':'grid'))));
    if(save){try{localStorage.setItem('tcg_vista',list?'list':'grid');}catch(_){/* almacenamiento bloqueado */}}
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  try{setView(localStorage.getItem('tcg_vista')==='list'?'list':'grid',false);}catch(_){setView('grid',false);}
  $('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
  controls.forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('cards').addEventListener('click',event=>{const button=event.target.closest('[data-open]');if(button)openDetail(button.dataset.open);});

  // Diálogo de trabajo: detalle a la izquierda y, si se edita, el editor a la derecha.
  function safeUrl(url) {try{const parsed=new URL(url);return ['https:','http:'].includes(parsed.protocol)?parsed.href:null;}catch(_){return null;}}
  function setPanes({detail=true,editor=false}={}) {
    $('detail-pane').hidden=!detail;$('editor-pane').hidden=!editor;
    $('work-layout').classList.toggle('editing',detail&&editor);
    $('detail-dialog').classList.toggle('with-editor',editor);
    $('detail-dialog').classList.toggle('editor-only',editor&&!detail);
  }
  function showDialog() {
    if(!$('detail-dialog').open)$('detail-dialog').showModal();
  }
  function detailHtml(c) {
    const imageSource=safeUrl(c.imagen_origen==='catalogo'?c.imagen_fuente:null),identitySource=safeUrl(c.fuente_identidad);
    const variant=c.variante && c.variante!=='registro_catalogo'?`<dt>Variante</dt><dd>${escapeHtml(c.variante)}</dd>`:'';
    const pending=c.pendiente?`<p class="detail-note">${escapeHtml(c.motivo_pendiente)}. Esta carta permanece en pendientes.</p>`:'';
    const links=(imageSource?`<a class="source-link" href="${escapeHtml(imageSource)}" target="_blank" rel="noopener noreferrer">Procedencia de la imagen ↗</a><br>`:'')+(identitySource?`<a class="source-link" href="${escapeHtml(identitySource)}" target="_blank" rel="noopener noreferrer">Referencia de identificación ↗</a>`:'');
    const notes=(c.estado||c.notas)?`<details><summary>Estado y notas del ejemplar</summary><p>${escapeHtml(c.estado)}</p><p>${escapeHtml(c.notas)}</p><p>Referencias de inventario: ${escapeHtml((c.ids_unidades || [c.id]).join(', '))}</p></details>`:'';
    const photo=c.imagen?`<img${isScan(c)?' class="scan"':''} src="${escapeHtml(c.imagen)}" alt="${escapeHtml(c.nombre)} ${escapeHtml(c.numero)}" referrerpolicy="no-referrer">${missingPicture(c)}`:noImage();
    return `<div class="detail-layout"><div class="detail-image"><div class="detail-photo">${photo}</div><span class="image-origin">${imageOrigin(c)} · ${languageName(c.idioma)}</span></div><div class="detail-info"><div class="detail-kicker">${languageName(c.idioma).toUpperCase()} · ${escapeHtml(c.codigo)}</div><h2 id="detail-title">${escapeHtml(c.nombre)}</h2><dl><dt>Número</dt><dd>${escapeHtml(c.numero)}</dd><dt>Expansión</dt><dd>${escapeHtml(c.expansion)}</dd><dt>Rareza</dt><dd>${escapeHtml(rarityName(c.rareza))}</dd><dt>Tipo</dt><dd>${escapeHtml(c.tipo)} · ${escapeHtml(c.categoria)}</dd>${variant}<dt>Cantidad</dt><dd>${c.cantidad} ${c.cantidad===1?'ejemplar':'ejemplares'}${c.cantidad_provisional?' · por confirmar':''}</dd></dl>${pending}${links}${notes}</div></div>`;
  }
  function openDetail(id) {
    const c=data.find(item=>item.id===id);if(!c)return;
    $('detail-content').innerHTML=detailHtml(c);
    setPanes({detail:true,editor:false});
    if(window.tcgAccount?.canEdit?.(c)){
      const button=document.createElement('button');
      button.type='button';button.className='secondary-button detail-edit';button.textContent='Editar carta';
      button.addEventListener('click',()=>window.tcgAccount.openEditor(c.id));
      document.querySelector('.detail-info').append(button);
    }
    showDialog();
  }
  window.tcgDialogos.wire($('detail-dialog'));
  window.tcgDialogos.wire($('about-dialog'));
  // El evento llega tarde: si el diálogo ya se ha vuelto a abrir, no se toca.
  $('detail-dialog').addEventListener('close',()=>{if($('detail-dialog').open)return;setPanes({detail:true,editor:false});$('detail-content').replaceChildren();});
  $('about-button').addEventListener('click',()=>$('about-dialog').showModal());
  $('close-about').addEventListener('click',()=>$('about-dialog').close());
  // Licencias, créditos y privacidad (se abre en la sección pedida).
  window.tcgDialogos.wire($('legal-dialog'));
  const openLegal=anchor=>{$('legal-dialog').showModal();$(anchor).scrollIntoView({block:'start'});};
  $('legal-button').addEventListener('click',()=>openLegal('legal-licencias'));
  $('privacy-button').addEventListener('click',()=>openLegal('legal-privacidad'));
  document.addEventListener('keydown',event=>{
    if(event.key==='/' && !/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) && !document.querySelector('dialog[open]')){event.preventDefault();$('search').focus();}
  });

  // Colección principal: datos iniciales más las fichas del propietario guardadas en Supabase.
  function mergeRemote(cards) {
    const merged=new Map(initial.map(c=>[c.id,c]));
    cards.forEach(c=>{
      const local=initial.find(item=>item.id===c.id);
      if(local&&String(c.imagen).startsWith('imagenes_cartas/')){
        c={...c};for(const key of ['imagen','imagen_url','imagen_fuente','imagen_origen','imagen_faltante','encuadre','recorte_metodo','contorno_normalizado']){if(key in local)c[key]=local[key];else delete c[key];}
      }
      merged.set(c.id,normalizeCard(c));
    });
    return [...merged.values()];
  }
  window.catalogoApp={
    getVisible:()=>visible.slice(),compare,reset,thumbnail,
    getData:()=>data.slice(),
    getMainData:()=>mainData.slice(),
    get showingMain(){return current==='main';},
    replaceRemote:cards=>{
      mainData=mergeRemote(cards);
      if(current==='main'){data=mainData;refreshCounts();render();}
    },
    // Muestra otra colección (p. ej. la de otra persona) y reinicia los filtros.
    setCards:(cards,keepFilters=false)=>{current='other';data=cards.map(normalizeCard);refreshCounts();if(keepFilters)render();else reset();},
    useMain:()=>{current='main';data=mainData;refreshCounts();reset();},
    openDetail,setPanes,showDialog,
  };
  refreshCounts();
  render();
})();
