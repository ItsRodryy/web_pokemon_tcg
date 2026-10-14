'use strict';
(() => {
  const initial = window.CATALOGO_DATA || [];
  let data = initial.slice();
  const collator = new Intl.Collator('es', {numeric:true,sensitivity:'base'});
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const languageName = value => ({'espa\u00f1ol':'Espa\u00f1ol',japones:'Japon\u00e9s',coreano:'Coreano'}[value] || value);
  const languageCode = value => ({'espa\u00f1ol':'ES',japones:'JP',coreano:'KR'}[value] || '\u2014');
  const rarityNames = {AR:'Ilustraci\u00f3n rara \u00b7 AR',SR:'S\u00faper rara \u00b7 SR',RR:'Doble rara \u00b7 RR',RRR:'Triple rara \u00b7 RRR',C:'Com\u00fan',U:'Poco com\u00fan',R:'Rara',pendiente:'Por confirmar',None:'Sin rareza indicada',Ninguno:'Sin rareza indicada',promo:'Promo',PROMO:'Promo',
    // TCGdex devuelve algunas rarezas en ingles incluso en su API en espanol.
    Common:'Com\u00fan',Uncommon:'Poco com\u00fan',Rare:'Rara','Holo Rare':'Holo Rara','Double rare':'Rara Doble','Ultra Rare':'Ultra Rara','Illustration rare':'Rara Ilustraci\u00f3n','Special illustration rare':'Rara Ilustraci\u00f3n Especial','Hyper rare':'Rara H\u00edper','Secret Rare':'Rara Secreta'};
  const rarityName = value => rarityNames[value] || value;
  // Sinonimos antiguos; el vocabulario comun es el de TCGdex en espanol.
  const typeAliases = {Incoloro:'Incolora',Oscuridad:'Oscura','Met\u00e1lico':'Met\u00e1lica'};
  const controls = ['search','sort','type','expansion','rarity','pending'];
  let language = '', visible = [];
  function compare(mode) {
    if(mode==='name_desc') return (a,b)=>collator.compare(b.nombre,a.nombre) || collator.compare(a.numero,b.numero);
    if(mode==='type') return (a,b)=>collator.compare(a.tipo,b.tipo) || collator.compare(a.nombre,b.nombre);
    if(mode==='expansion') return (a,b)=>collator.compare(a.expansion,b.expansion) || collator.compare(a.numero,b.numero);
    if(mode==='rarity') return (a,b)=>collator.compare(rarityName(a.rareza),rarityName(b.rareza)) || collator.compare(a.nombre,b.nombre);
    if(mode==='quantity') return (a,b)=>b.cantidad-a.cantidad || collator.compare(a.nombre,b.nombre);
    if(mode==='number') return (a,b)=>collator.compare(a.numero,b.numero) || collator.compare(a.nombre,b.nombre);
    return (a,b)=>collator.compare(a.nombre,b.nombre) || collator.compare(a.numero,b.numero);
  }
  function populate(id,values,label=v=>v) {
    const selected=$(id).value;
    while($(id).options.length>1)$(id).remove(1);
    [...new Set(values)].sort(collator.compare).forEach(value=>{
      const option=document.createElement('option');option.value=value;option.textContent=label(value);$(id).append(option);
    });
    $(id).value=[...$(id).options].some(o=>o.value===selected)?selected:'';
  }
  function refreshCounts() {
    populate('type',data.map(c=>c.tipo));populate('expansion',data.map(c=>c.expansion));populate('rarity',data.map(c=>rarityName(c.rareza)));
    $('total-units').innerHTML=data.reduce((n,c)=>n+c.cantidad,0)+'<small>ejemplares</small>';
    $('total-distinct').textContent=data.length+' cartas';
    document.querySelectorAll('[data-language]').forEach(b=>b.querySelector('span:last-child').textContent=data.filter(c=>!b.dataset.language || c.idioma===b.dataset.language).length);
  }
  refreshCounts();
  document.querySelectorAll('[data-language]').forEach(button=>{
    const lang=button.dataset.language;
    button.querySelector('span:last-child').textContent=data.filter(c=>!lang || c.idioma===lang).length;
    button.addEventListener('click',()=>{
      language=lang;
      document.querySelectorAll('[data-language]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
      render();
    });
  });
  function thumbnail(c) {
    const r=c.encuadre;
    const crop=r && [r.x,r.y,r.ancho,r.alto,r.ancho_original,r.alto_original].every(Number.isFinite) && r.ancho>0 && r.alto>0;
    const style=crop?` style="width:${100*r.ancho_original/r.ancho}%;height:${100*r.alto_original/r.alto}%;left:${-100*r.x/r.ancho}%;top:${-100*r.y/r.alto}%;"`:'';
    return `<img${crop?' class="cropped-photo"':''}${style} src="${escapeHtml(c.imagen)}" alt="${escapeHtml(c.nombre)} ${escapeHtml(c.numero)} \u00b7 ${languageName(c.idioma)}" loading="lazy" decoding="async" width="${crop?r.ancho_original:1104}" height="${crop?r.alto_original:1504}">${missingPicture(c)}`;
  }
  function imageOrigin(c){
    if(c.imagen_faltante) return 'Referencia provisional · falta la imagen exacta';
    return {catalogo:'Imagen de catálogo',referencia_web:'Referencia web'}[c.imagen_origen] || 'Foto propia';
  }
  function missingPicture(c){return c.imagen_faltante?'<div class="missing-picture"><span>Falta la foto<br>de esta edición</span></div>':'';}
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
    $('visible-description').textContent=`${visible.length} ${visible.length===1?'carta':'cartas'} \u00b7 ${units} ${units===1?'ejemplar':'ejemplares'}`;
    $('cards').innerHTML=visible.map(c=>`<article class="card" data-id="${escapeHtml(c.id)}"><button type="button" class="card-open" data-open="${escapeHtml(c.id)}" aria-label="Ver ${escapeHtml(c.nombre)}, ${escapeHtml(c.numero)}, ${languageName(c.idioma)}"><div class="card-picture">${thumbnail(c)}${c.cantidad>1?`<span class="quantity-badge" title="${c.cantidad} ejemplares">\u00d7${c.cantidad}</span>`:''}</div><div class="card-info"><div class="card-meta"><span class="language-mark ${languageCode(c.idioma).toLowerCase()}">${languageCode(c.idioma)}</span><span>${escapeHtml(c.numero)}</span><span class="dot"></span><span>${escapeHtml(c.tipo)}</span></div><h3 class="card-name">${escapeHtml(c.nombre)}</h3><div class="card-set" title="${escapeHtml(c.expansion)}">${escapeHtml(c.expansion)}</div><div class="card-bottom"><span class="card-rarity">${escapeHtml(rarityName(c.rareza))}</span>${c.pendiente?'<span class="pending-tag">Por confirmar</span>':'<span class="detail-hint" aria-hidden="true">\u2197</span>'}</div></div></button></article>`).join('');
    $('empty').hidden=visible.length!==0;
  }
  function reset() {
    language='';controls.forEach(id=>$(id).value=id==='sort'?'name_asc':'');
    document.querySelectorAll('[data-language]').forEach(b=>{const active=!b.dataset.language;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    render();
  }
  $('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
  controls.forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('cards').addEventListener('click',event=>{const button=event.target.closest('[data-open]');if(button)openDetail(button.dataset.open);});
  function safeUrl(url) {try{const parsed=new URL(url);return ['https:','http:'].includes(parsed.protocol)?parsed.href:null;}catch(_){return null;}}
  function openDetail(id) {
    const c=data.find(c=>c.id===id);if(!c)return;
    const imageSource=safeUrl(c.imagen_origen!=='foto_propia'?c.imagen_fuente:null),identitySource=safeUrl(c.fuente_identidad);
    $('detail-content').innerHTML=`<div class="detail-layout"><div class="detail-image"><div class="detail-photo"><img src="${escapeHtml(c.imagen)}" alt="${escapeHtml(c.nombre)} ${escapeHtml(c.numero)}">${missingPicture(c)}</div><span class="image-origin">${imageOrigin(c)} \u00b7 ${languageName(c.idioma)}</span></div><div class="detail-info"><div class="detail-kicker">${languageName(c.idioma).toUpperCase()} \u00b7 ${escapeHtml(c.codigo)}</div><h2 id="detail-title">${escapeHtml(c.nombre)}</h2><dl><dt>N\u00famero</dt><dd>${escapeHtml(c.numero)}</dd><dt>Expansi\u00f3n</dt><dd>${escapeHtml(c.expansion)}</dd><dt>Rareza</dt><dd>${escapeHtml(rarityName(c.rareza))}</dd><dt>Tipo</dt><dd>${escapeHtml(c.tipo)} \u00b7 ${escapeHtml(c.categoria)}</dd>${c.variante && c.variante!=='registro_catalogo'?`<dt>Variante</dt><dd>${escapeHtml(c.variante)}</dd>`:''}<dt>Cantidad</dt><dd>${c.cantidad} ${c.cantidad===1?'ejemplar':'ejemplares'}${c.cantidad_provisional?' \u00b7 por confirmar':''}</dd></dl>${c.pendiente?`<p class="detail-note">${escapeHtml(c.motivo_pendiente)}. Esta carta permanece en pendientes.</p>`:''}${imageSource?`<a class="source-link" href="${escapeHtml(imageSource)}" target="_blank" rel="noopener noreferrer">Procedencia de la imagen \u2197</a><br>`:''}${identitySource?`<a class="source-link" href="${escapeHtml(identitySource)}" target="_blank" rel="noopener noreferrer">Referencia de identificaci\u00f3n \u2197</a>`:''}<details><summary>Estado y notas del ejemplar</summary><p>${escapeHtml(c.estado)}</p><p>${escapeHtml(c.notas)}</p><p>Referencias de inventario: ${escapeHtml((c.ids_unidades || [c.id]).join(', '))}</p></details></div></div>`;
    if(window.tcgAccount?.isAdmin){const button=document.createElement('button');button.type='button';button.className='secondary-button detail-edit';button.textContent='Editar carta';button.addEventListener('click',()=>{$('detail-dialog').close();window.tcgAccount.openEditor(c.id);});document.querySelector('.detail-info').append(button);}
    $('detail-dialog').showModal();
  }
  $('close-detail').addEventListener('click',()=>$('detail-dialog').close());
  $('about-button').addEventListener('click',()=>$('about-dialog').showModal());
  $('close-about').addEventListener('click',()=>$('about-dialog').close());
  ['detail-dialog','about-dialog'].forEach(id=>$(id).addEventListener('click',event=>{
    if(event.target!==$(id))return;
    const r=$(id).getBoundingClientRect();
    if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)$(id).close();
  }));
  document.addEventListener('keydown',event=>{
    if(event.key==='/' && !/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) && !document.querySelector('dialog[open]')){event.preventDefault();$('search').focus();}
  });
  window.catalogoApp={getVisible:()=>visible.slice(),compare,reset,getData:()=>data.slice(),replaceRemote:cards=>{
    const merged=new Map(initial.map(c=>[c.id,c]));
    cards.forEach(c=>{
      const local=initial.find(item=>item.id===c.id);
      if(local&&String(c.imagen).startsWith('imagenes_cartas/')){
        c={...c};for(const key of ['imagen','imagen_url','imagen_fuente','imagen_origen','imagen_faltante','encuadre','recorte_metodo','contorno_normalizado']){if(key in local)c[key]=local[key];else delete c[key];}
      }
      if(typeAliases[c.tipo])c={...c,tipo:typeAliases[c.tipo]};
      merged.set(c.id,c);
    });data=[...merged.values()];refreshCounts();render();
  },thumbnail};
  render();
})();
