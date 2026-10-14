// Prueba de Descubrir, colecciones de otras personas, colección propia y moderación.
// Simulada: usa el Supabase falso y no equivale a una comprobación con cuentas reales.
const {probar} = require('./ayuda_navegador.cjs');
const ASH = '33333333-3333-4333-8333-333333333333';

probar('colecciones', async ({evalJS, esperar, abrir, tamano}) => {
  // 1. Visitante sin sesión: Descubrir, colección ajena en solo lectura, volver y enlace compartido.
  await abrir('anonymous');
  await evalJS(`(()=>{if(document.getElementById('discover-button').hidden)throw Error('Descubrir oculto');document.getElementById('discover-button').click();})()`);
  await esperar('document.querySelectorAll("#discover-list .discover-item").length===2');
  await evalJS(`(()=>{const t=[...document.querySelectorAll('#discover-list .discover-open')].map(b=>b.textContent);
    if(!t[0].includes('colección principal')||!t[0].includes('177 cartas'))throw Error('El propietario debe ir primero: '+t[0]);
    if(!t[1].includes('Ash')||!t[1].includes('3 cartas')||!t[1].includes('6 ejemplares'))throw Error('Falta Ash: '+t[1]);
    if(t.some(x=>x.includes('Sin cartas')))throw Error('Aparece una persona sin cartas');
    if(document.querySelector('#discover-list .text-button'))throw Error('Un visitante ve botones de moderación');
    document.querySelectorAll('#discover-list .discover-open')[1].click();})()`);
  await esperar('catalogoApp.getData().length===3 && !document.getElementById("collection-bar").hidden');
  await evalJS(`(()=>{const a=(v,s)=>{if(!v)throw Error(s)},bar=document.getElementById('collection-bar').textContent,datos=catalogoApp.getData();
    a(bar.includes('Colección de Ash') && bar.includes('3 cartas'),'Barra de colección: '+bar);
    a(datos.some(c=>c.nombre==='Oddish' && c.imagen.includes('assets.tcgdex.net') && c.imagen_miniatura.endsWith('low.webp')),'Cartas del índice con imagen enlazada');
    a(datos.every(c=>c.imagen.startsWith('https://')),'Imágenes no enlazadas');
    a(location.search.includes('${ASH}'),'La dirección no es compartible');
    a(document.getElementById('add-card').hidden,'Un visitante puede añadir cartas');
    a(document.querySelector('.card-picture.scan'),'Los escaneos enlazados llevan esquinas redondeadas');
    document.querySelector('[data-open]').click();a(!document.querySelector('.detail-edit'),'Se puede editar una colección ajena');a(document.querySelector('.image-origin').textContent.includes('Escaneo de referencia'),'Origen de la imagen');
    document.getElementById('close-detail').click();})()`);
  await evalJS(`document.querySelector('#collection-bar button').click()`);
  await esperar('catalogoApp.getData().length===177 && document.getElementById("collection-bar").hidden && !location.search.includes("u=")');
  await abrir('anonymous', '&u=' + ASH);
  await esperar('catalogoApp.getData().length===3 && document.getElementById("collection-bar").textContent.includes("Ash")');
  await abrir('anonymous', '&u=22222222-2222-4222-8222-222222222222');
  await esperar('!document.getElementById("connection-status").hidden && document.getElementById("connection-status").textContent.includes("no existe")');

  // 2. Persona normal en móvil: colección vacía, alta, edición, borrado, visibilidad y borrado de datos.
  await tamano(390, 844, true);
  await abrir('viewer');
  await esperar('catalogoApp.getData().length===0 && document.getElementById("collection-bar").textContent.includes("vacía") && !document.getElementById("add-card").hidden');
  await evalJS(`(async()=>{await tcgAccount.openEditor();const s=document.getElementById('set-search');s.value='PFL';s.dispatchEvent(new Event('input'));})()`);
  await evalJS(`(()=>{document.querySelector('#set-options .combo-option').click();const i=document.getElementById('pokemon-search');i.value='Odd';i.dispatchEvent(new Event('input'));})()`);
  await evalJS(`document.querySelector('#card-matches .card-match').click();`);
  await esperar('tcgRegistry.selected?.catalogo_id==="me02-001"');
  await evalJS(`(()=>{const a=(v,s)=>{if(!v)throw Error(s)},oculto=id=>getComputedStyle(document.getElementById(id).closest('label')||document.getElementById(id)).display==='none';
    a(oculto('card-photo')&&oculto('card-category')&&oculto('card-type')&&oculto('edit-existing'),'El formulario de persona normal muestra campos del propietario');
    a(getComputedStyle(document.querySelector('#card-form [name=notas]').closest('label')).display==='none','Notas visibles');
    document.getElementById('card-form').elements.cantidad.value=2;document.getElementById('card-form').requestSubmit();})()`);
  await esperar('!document.getElementById("detail-dialog").open && catalogoApp.getData().length===1');
  await evalJS(`(()=>{const a=(v,s)=>{if(!v)throw Error(s)},fila=testDatabase.userCards.find(r=>r.owner_id==='22222222-2222-4222-8222-222222222222');
    a(fila && fila.cantidad===2 && fila.catalogo_id==='me02-001' && fila.tipo==='Planta' && fila.idioma==='español','Fila guardada: '+JSON.stringify(fila));
    a(catalogoApp.getData()[0].nombre==='Oddish','La carta se construye desde el índice');
    a(testDatabase.uploads.length===0,'Se han subido fotos');
    a(document.documentElement.scrollWidth<=innerWidth,'Desbordamiento móvil');})()`);
  // Misma carta otra vez: se rechaza y se indica cómo cambiar la cantidad.
  await evalJS(`(async()=>{await tcgAccount.openEditor();const s=document.getElementById('set-search');s.value='PFL';s.dispatchEvent(new Event('input'));})()`);
  await evalJS(`(()=>{document.querySelector('#set-options .combo-option').click();const i=document.getElementById('pokemon-search');i.value='Odd';i.dispatchEvent(new Event('input'));})()`);
  await evalJS(`document.querySelector('#card-matches .card-match').click();`);
  await esperar('tcgRegistry.selected?.catalogo_id==="me02-001"');
  await evalJS(`document.getElementById('card-form').requestSubmit()`);
  await esperar('document.getElementById("editor-status").textContent.includes("Ya tienes esta carta")');
  await evalJS(`window.tcgDialogos.closeNow(document.getElementById('detail-dialog'))`);
  // Editar la cantidad desde el detalle y quitar la carta.
  await evalJS(`(async()=>{document.querySelector('[data-open]').click();document.querySelector('.detail-edit').click();await new Promise(r=>setTimeout(r,900));
    const f=document.getElementById('card-form');f.elements.cantidad.value=5;f.requestSubmit();})()`);
  await esperar('catalogoApp.getData()[0].cantidad===5 && document.getElementById("editor-pane").hidden');
  await evalJS(`(async()=>{document.querySelector('.detail-edit').click();await new Promise(r=>setTimeout(r,900));if(document.getElementById('remove-card').hidden)throw Error('Falta quitar');document.getElementById('remove-card').click();})()`);
  await esperar('catalogoApp.getData().length===0 && !document.getElementById("detail-dialog").open && testDatabase.userCards.filter(r=>r.owner_id==="22222222-2222-4222-8222-222222222222").length===0');
  // Con una carta, aparece en Descubrir; si se oculta, deja de aparecer.
  await evalJS(`(async()=>{await tcgAccount.openEditor();const s=document.getElementById('set-search');s.value='PFL';s.dispatchEvent(new Event('input'));})()`);
  await evalJS(`(()=>{document.querySelector('#set-options .combo-option').click();const i=document.getElementById('pokemon-search');i.value='Odd';i.dispatchEvent(new Event('input'));})()`);
  await evalJS(`document.querySelector('#card-matches .card-match').click();`);
  await esperar('tcgRegistry.selected?.catalogo_id==="me02-001"');
  await evalJS(`document.getElementById('card-form').requestSubmit()`);
  await esperar('!document.getElementById("detail-dialog").open && catalogoApp.getData().length===1');
  await evalJS(`document.getElementById('discover-button').click()`);
  await esperar('document.querySelectorAll("#discover-list .discover-item").length===3');
  await evalJS(`window.tcgDialogos.closeNow(document.getElementById('discover-dialog'));document.getElementById('account-button').click();document.getElementById('profile-visible').checked=false;document.getElementById('profile-visible').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('profile-form').requestSubmit();`);
  await esperar('testDatabase.profiles["22222222-2222-4222-8222-222222222222"].visible===false');
  await evalJS(`window.tcgDialogos.closeNow(document.getElementById('account-dialog'));document.getElementById('discover-button').click()`);
  await esperar('document.querySelectorAll("#discover-list .discover-item").length===2');
  // Borrar mis datos: dos pulsaciones (confirmación) y se vacía todo.
  await evalJS(`(()=>{window.tcgDialogos.closeNow(document.getElementById('discover-dialog'));document.getElementById('account-button').click();const b=document.getElementById('delete-data');b.click();if(b.dataset.confirm!=='si')throw Error('Sin confirmación');b.click();})()`);
  await esperar('testDatabase.userCards.filter(r=>r.owner_id==="22222222-2222-4222-8222-222222222222").length===0 && catalogoApp.getData().length===0');

  // 3. El propietario ve su colección principal con edición y puede ocultar perfiles ajenos.
  await tamano(1440, 1000);
  await abrir('owner');
  await esperar('window.tcgAccount.isAdmin && catalogoApp.getData().length===177 && !document.getElementById("add-card").hidden');
  await evalJS(`document.getElementById('discover-button').click()`);
  await esperar('document.querySelectorAll("#discover-list .discover-item").length===2');
  await evalJS(`(()=>{const botones=[...document.querySelectorAll('#discover-list .text-button')];if(botones.length!==1||botones[0].textContent!=='Ocultar')throw Error('Moderación del propietario');botones[0].click();})()`);
  await esperar('document.querySelector("#discover-list .text-button")?.textContent==="Mostrar" && document.querySelector("#discover-list").textContent.includes("oculto")');
  await evalJS(`(()=>{document.querySelectorAll('#discover-list .discover-open')[0].click();})()`);
  await esperar('document.getElementById("collection-bar").hidden && catalogoApp.getData().length===177 && !document.getElementById("add-card").hidden');
  await abrir('anonymous');
  await evalJS(`document.getElementById('discover-button').click()`);
  await esperar('document.querySelectorAll("#discover-list .discover-item").length===1');
  // 4. Web publicada antes de aplicar el SQL v2: sin Descubrir ni colecciones, pero todo lo anterior sigue funcionando.
  await abrir('viewer', '&v2=off');
  await esperar('window.tcgAccount.user && window.tcgAccount.profile && document.getElementById("discover-button").hidden');
  await evalJS(`(()=>{const a=(v,s)=>{if(!v)throw Error(s)};
    a(document.getElementById('add-card').hidden,'Sin SQL v2 una persona normal no debe poder añadir cartas');
    a(catalogoApp.getData().length===177,'Sin SQL v2 se muestra la colección principal');
    a(!tcgSesion.v2,'Debe detectar que falta el SQL v2');
    document.getElementById('account-button').click();
    a(getComputedStyle(document.getElementById('avatar-options').closest('fieldset')).display==='none','Avatares visibles sin SQL v2');
    a(document.getElementById('delete-data').hidden,'Borrar datos visible sin SQL v2');
    document.getElementById('username').value='Solo nombre';document.getElementById('profile-form').requestSubmit();})()`);
  await esperar('document.getElementById("brand-name").textContent==="Solo nombre"');
  await abrir('owner', '&v2=off');
  await esperar('window.tcgAccount.isAdmin && !document.getElementById("add-card").hidden && document.getElementById("discover-button").hidden');
  console.log('Colecciones: Descubrir, colecciones ajenas en solo lectura, enlaces, alta/edición/borrado propios, visibilidad, borrado de datos y moderación correctos.');
}).catch(e => { console.error(e.message); process.exitCode = 1; });
