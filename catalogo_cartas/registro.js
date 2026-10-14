'use strict';
(() => {
  const $=id=>document.getElementById(id),form=$('card-form');
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const number=v=>norm(v).split('/')[0].replace(/^0+(?=\d)/,'');
  const registry={refs:null,set:null,selected:null,existing:null,version:0,promise:null};
  const labels={Pokemon:'Pokémon',Pokémon:'Pokémon',Trainer:'Entrenador',Entrenador:'Entrenador',Energy:'Energía',Energía:'Energía'};
  const typeNames={Grass:'Planta',Fire:'Fuego',Water:'Agua',Lightning:'Rayo',Psychic:'Psíquico',Fighting:'Lucha',Darkness:'Oscura',Metal:'Metálica',Dragon:'Dragón',Fairy:'Hada',Colorless:'Incolora',Incoloro:'Incolora',Oscuridad:'Oscura',Metálico:'Metálica',초:'Planta',불꽃:'Fuego',물:'Agua',번개:'Rayo',초능력:'Psíquico',격투:'Lucha',악:'Oscura',강철:'Metálica',드래곤:'Dragón',페어리:'Hada',무색:'Incolora'};
  // TCGdex responde en ingles para japones y coreano, y a veces tambien en espanol.
  const rarityNames={Common:'Común',Uncommon:'Poco común',Rare:'Rara','Holo Rare':'Holo Rara','Double rare':'Rara Doble','Ultra Rare':'Ultra Rara','Illustration rare':'Rara Ilustración','Special illustration rare':'Rara Ilustración Especial','Hyper rare':'Rara Híper','Secret Rare':'Rara Secreta','Shiny rare':'Rara Variocolor','Shiny Ultra Rare':'Ultra Rara Variocolor','ACE SPEC Rare':'AS TÁCTICO',Promo:'Promo',PROMO:'Promo',None:'',Ninguno:''};
  function rarityFor(detail,brief){
    // Las siglas impresas de Daldagury (RR, AR...) identifican mejor las ediciones asiaticas.
    const value=String(brief.rareza||detail.rarity||'').trim();
    const name=Object.hasOwn(rarityNames,value)?rarityNames[value]:value;
    return {rareza:name||'Sin rareza indicada',rareza_fuente:value};
  }
  const isLatin=a=>/^[\x00-\x7f]*$/.test(a);
  const subtypes={Item:'Objeto',Tool:'Herramienta Pokémon',Herramienta:'Herramienta Pokémon',Supporter:'Partidario',Stadium:'Estadio',Normal:'Energía básica',Basic:'Energía básica',Básica:'Energía básica',Special:'Energía especial',Especial:'Energía especial'};
  const text=(el,value)=>el.textContent=String(value||'');
  function help(value){text($('reference-status'),value);}
  function invalidate(){registry.version++;registry.selected=null;$('selected-card').hidden=true;}
  function languageSets(){
    const sets=registry.refs?.expansiones.filter(s=>s.idioma===form.elements.idioma.value)||[];
    // Un mismo codigo puede corresponder a varios productos; conservarlos separados.
    return sets.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.nombre.localeCompare(b.nombre));
  }
  function setLabel(s){return (s.codigo?s.codigo+' · ':'')+s.nombre;}
  function makeCombo(inputId,listId,getOptions){
    const input=$(inputId),list=$(listId);let options=[],active=-1;
    function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
    function activate(index){
      active=index;[...list.querySelectorAll('[role=option]')].forEach((el,i)=>{el.setAttribute('aria-selected',String(i===index));if(i===index){input.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'});}});
    }
    function show(){
      options=getOptions();active=-1;list.replaceChildren();
      options.slice(0,60).forEach((o,i)=>{
        const button=document.createElement('button');button.type='button';button.className='combo-option';button.id=listId+'-'+i;button.setAttribute('role','option');button.setAttribute('aria-selected','false');text(button,o.label);
        if(o.sub){const small=document.createElement('small');text(small,o.sub);button.append(small);}
        button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{close();o.choose();});list.append(button);
      });
      if(!options.length){const p=document.createElement('div');p.className='combo-empty';text(p,registry.refs?'Sin coincidencias. Prueba otro código, nombre o número.':'Cargando referencias…');list.append(p);}
      list.hidden=false;input.setAttribute('aria-expanded','true');
    }
    input.addEventListener('focus',show);input.addEventListener('input',show);
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();e.preventDefault();e.stopPropagation();return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)show();activate(Math.max(0,Math.min(Math.min(options.length,60)-1,active+(e.key==='ArrowDown'?1:-1))));}
      if(e.key==='Enter'&&!list.hidden){e.preventDefault();if(active>=0){const o=options[active];close();o.choose();}}
      if(e.key==='Tab')close();
    });
    document.addEventListener('click',e=>{if(!input.parentElement.contains(e.target))close();});
    return {show,close};
  }
  const setCombo=makeCombo('set-search','set-options',()=>{
    const q=norm($('set-search').value).trim();return languageSets().filter(s=>norm([s.codigo,s.nombre,s.api_id,...(s.alias||[])].join(' ')).includes(q)).map(s=>({label:setLabel(s),sub:(s.codigo?'':'Sin código impreso · ')+(s.cartas.length?s.cartas.length+' referencias':'Sin cartas disponibles en esta fuente'),choose:()=>chooseSet(s)}));
  });
  function speciesFor(query){
    const q=norm(query).trim();return registry.refs?.pokemon.filter(p=>p.alias.some(a=>norm(a).includes(q)))||[];
  }
  function candidates(){
    if(!registry.set)return [];
    const query=norm($('pokemon-search').value).trim(),n=number($('card-number').value);
    const aliases=speciesFor(query).flatMap(p=>p.alias.map(norm));
    return registry.set.cartas.filter(c=>(!n||number(c.numero)===n)&&(!query||norm(c.nombre).includes(query)||aliases.some(a=>(a.length>1||!isLatin(a))&&norm(c.nombre).includes(a))));
  }
  const pokemonCombo=makeCombo('pokemon-search','pokemon-options',()=>{
    const cards=candidates();
    if(registry.set&&cards.length)return cards.map(c=>({label:c.nombre+' · '+(c.numero_completo||c.numero),sub:setLabel(registry.set),choose:()=>chooseCard(c)}));
    return speciesFor($('pokemon-search').value).map(p=>({label:p.nombre,sub:'#'+p.id,choose:()=>{$('pokemon-search').value=p.nombre;invalidate();showMatches();}}));
  });
  function chooseSet(s){
    registry.set=s;registry.existing=null;invalidate();$('set-search').value=setLabel(s);$('card-number').value='';$('pokemon-search').value='';
    help(s.cartas.length?'Busca la carta por nombre o escribe su número. Elige una coincidencia para registrarla.':'Esta expansión está identificada, pero la fuente aún no contiene sus cartas. El registro queda bloqueado hasta disponer de una referencia real.');showMatches();$('pokemon-search').focus();
  }
  function showMatches(){
    const list=$('card-matches');list.replaceChildren();const cards=candidates();list.hidden=!registry.set||!cards.length||!!registry.selected;
    cards.slice(0,40).forEach(c=>{
      const button=document.createElement('button');button.type='button';button.className='card-match';
      const span=document.createElement('span');text(span,c.nombre);const small=document.createElement('small');text(small,(c.numero_completo||c.numero)+' · '+(registry.set.codigo||registry.set.nombre));span.append(small);button.append(span);
      button.addEventListener('click',()=>chooseCard(c));list.append(button);
    });
    if(cards.length>40){const p=document.createElement('p');p.className='field-help';text(p,'Hay '+cards.length+' coincidencias. Escribe más letras o el número para concretar.');list.append(p);}
  }
  $('set-search').addEventListener('input',()=>{registry.set=null;registry.existing=null;invalidate();showMatches();});
  $('pokemon-search').addEventListener('input',()=>{registry.existing=null;invalidate();showMatches();});
  $('card-number').addEventListener('input',()=>{registry.existing=null;invalidate();pokemonCombo.close();showMatches();const cards=candidates();if(cards.length===1&&number($('card-number').value))chooseCard(cards[0]);});
  form.elements.idioma.addEventListener('change',()=>{registry.set=null;registry.existing=null;invalidate();$('set-search').value='';$('pokemon-search').value='';$('card-number').value='';setCombo.close();pokemonCombo.close();showMatches();help('Elige una expansión del idioma seleccionado.');});
  function classification(c){
    const group=labels[c.category||c.categoria]||'';
    const subtype=subtypes[c.trainerType||c.energyType]||c.trainerType||'';
    return {category:subtype||group,type:group==='Entrenador'||group==='Energía'?group:(c.types||[]).map(t=>typeNames[t]||t).join(' / ')};
  }
  function selectValue(select,value){
    select.value=[...select.options].some(o=>o.value===value)?value:'';
  }
  function showSelected(card,category,type){
    if(type.includes(' / ')&&type.split(' / ').every(t=>registry.refs.tipos.includes(t))&&!Array.from($('card-type').options).some(o=>o.value===type))$('card-type').add(new Option(type,type));
    selectValue($('card-category'),category);selectValue($('card-type'),type);
    $('card-category').disabled=!!$('card-category').value;
    $('card-type').disabled=!!$('card-type').value;
    const panel=$('selected-card');panel.replaceChildren();panel.hidden=false;
    const strong=document.createElement('strong');text(strong,card.nombre+' · '+card.numero);
    const span=document.createElement('span');text(span,card.expansion+(card.rareza&&card.rareza!=='Sin rareza indicada'?' · '+card.rareza:''));panel.append(strong,span);
    $('card-matches').hidden=true;
    help('Carta seleccionada. '+((!category||!type)&&!form.classList.contains('user-mode')?'Elige su categoría y tipo según lo que aparece impreso en la carta.':'La categoría y el tipo proceden de su referencia.'));
  }
  async function chooseCard(brief){
    const set=registry.set;if(!set)return;invalidate();const version=registry.version;
    pokemonCombo.close();help('Comprobando la carta…');let detail={};
    if(!brief.id.startsWith('dalda:')){
      try{
        const url='https://api.tcgdex.net/v2/'+set.idioma_api+'/cards/'+encodeURIComponent(brief.id);
        const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Referencia no disponible');const d=await response.json();
        // Lista cerrada: no incorporar respuestas completas ni datos de mercado.
        if(d.id!==brief.id||number(d.localId)!==number(brief.numero))throw Error('La identidad no coincide');
        detail={name:d.name,category:d.category,types:d.types,trainerType:d.trainerType,energyType:d.energyType,rarity:d.rarity,dexId:d.dexId};
      }catch(_){/* El indice local conserva una identidad real aunque la API no responda. */}
    }
    if(version!==registry.version||registry.set!==set)return;
    const classified=classification(detail);
    if(!classified.category){
      const species=registry.refs.pokemon.find(p=>p.alias.some(a=>(norm(a).length>1||!isLatin(a))&&norm(brief.nombre).includes(norm(a))));
      if(species)classified.category='Pokémon';
    }
    const category=registry.refs.categorias.find(c=>c.valor===classified.category);
    const dalda=brief.id.startsWith('dalda:');
    const card={nombre:brief.nombre,idioma:set.idioma,numero:brief.numero_completo||(brief.numero+(set.total?'/'+set.total:'')),codigo:set.codigo,expansion:set.nombre,
      categoria:category?.grupo||classified.category,tipo:classified.type,subcategoria:category?.subtipo||'',...rarityFor(detail,brief),
      variante:'registro_catalogo',catalogo_id:brief.id,catalogo_expansion_id:set.id,
      fuente_identidad:dalda?'https://daldagury.com/tcg/pokemon/card/'+encodeURIComponent(brief.id.slice(6)):'https://api.tcgdex.net/v2/'+set.idioma_api+'/cards/'+encodeURIComponent(brief.id),
      nombre_original:detail.name||brief.nombre,identidad_verificada:true};
    registry.selected=card;$('pokemon-search').value=card.nombre;$('card-number').value=card.numero;
    showSelected(card,classified.category,classified.type);
  }
  async function prepare(){
    if(registry.refs)return registry.refs;
    if(!registry.promise)registry.promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=new URL('catalogo_cartas/referencias.js?v=20261014_5',location.href).href;
      script.onload=()=>window.TCG_REFERENCIAS?resolve(window.TCG_REFERENCIAS):reject(Error('No se encontraron las referencias.'));script.onerror=()=>reject(Error('No se pudo cargar el índice de cartas.'));document.head.append(script);
    }).then(refs=>{
      registry.refs=refs;
      $('card-category').replaceChildren(new Option('Elige una categoría',''),...refs.categorias.map(c=>new Option(c.valor,c.valor)));
      const types=[...refs.tipos,'Entrenador','Energía'];$('card-type').replaceChildren(new Option('Elige un tipo',''),...types.map(t=>new Option(t,t)));
      help(refs.expansiones.length+' expansiones y productos · '+refs.pokemon.length+' Pokémon. Primero elige idioma y expansión.');return refs;
    }).catch(e=>{registry.promise=null;help(e.message);throw e;});
    return registry.promise;
  }
  function setExisting(card){
    invalidate();registry.existing=card||null;registry.set=null;
    ['set-search','pokemon-search','card-number'].forEach(id=>{$(id).readOnly=!!card;$(id).value='';});form.elements.idioma.disabled=!!card;
    $('card-category').disabled=false;$('card-type').disabled=false;$('card-category').value='';$('card-type').value='';$('card-matches').hidden=true;
    if(card){
      $('set-search').value=(card.codigo?card.codigo+' · ':'')+card.expansion;$('pokemon-search').value=card.nombre;$('card-number').value=card.numero;form.elements.idioma.value=card.idioma;
      registry.selected={...card};showSelected(card,card.subcategoria||card.categoria,card.tipo);
      // Al editar solo cambian cantidad, foto y notas; la identidad se conserva.
      $('card-category').disabled=true;$('card-type').disabled=true;
      help('Ficha existente: puedes cambiar la cantidad total, la foto y las notas.');
    }else help('Elige idioma y expansión. Después busca la carta por nombre o número.');
    setCombo.close();pokemonCombo.close();
  }
  function getCard(options={}){
    const card=registry.selected;
    if(!card||card.nombre!==$('pokemon-search').value||number(card.numero)!==number($('card-number').value)||card.idioma!==form.elements.idioma.value)throw Error('Elige una carta existente entre las coincidencias. No se pueden registrar nombres o números inventados.');
    if(registry.existing)return {...registry.existing};
    // Otras personas solo registran la carta; categoría y tipo salen de la referencia si constan.
    if(options.lenient)return {...card};
    const cat=registry.refs.categorias.find(c=>c.valor===$('card-category').value),type=$('card-type').value;
    if(!cat||!type)throw Error('Elige la categoría y el tipo que aparecen en la carta.');
    if((cat.grupo==='Entrenador'&&type!=='Entrenador')||(cat.grupo==='Energía'&&type!=='Energía')||(cat.grupo==='Pokémon'&&['Entrenador','Energía'].includes(type)))throw Error('La categoría y el tipo deben corresponder a la misma carta.');
    return {...card,categoria:cat.grupo,subcategoria:cat.subtipo,tipo:type};
  }
  window.tcgRegistry={prepare,setExisting,getCard,get refs(){return registry.refs;},get selected(){return registry.selected;}};
})();
