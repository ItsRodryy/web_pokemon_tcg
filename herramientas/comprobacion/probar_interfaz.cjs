const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
fs.rmSync(path.join(__dirname,'perfil_pruebas'),{recursive:true,force:true}); // Cada ejecucion parte de un perfil limpio.
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0','--no-first-run','--disable-background-networking','--window-size=1440,1100','--force-device-scale-factor=1','--user-data-dir='+path.join(__dirname,'perfil_pruebas'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let ws,n=0,stderr='',started=false;const pending=new Map(),errors=[];
const timer=setTimeout(()=>{child.kill();console.error('Tiempo agotado');process.exitCode=1;},45000);
async function run(url){
 ws=new WebSocket(url);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 const cmd=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 try{
  const t=await cmd('Target.createTarget',{url:'about:blank'}),sid=(await cmd('Target.attachToTarget',{targetId:t.targetId,flatten:true})).sessionId;
  await cmd('Runtime.enable',{},sid);await cmd('Page.enable',{},sid);await cmd('Network.enable',{},sid);
  await cmd('Network.setBlockedURLs',{urls:['*supabase.co*']},sid); // Nunca mutar servicios reales en una prueba.
  await cmd('Page.addScriptToEvaluateOnNewDocument',{source:fs.readFileSync(path.join(__dirname,'supabase_simulado.js'),'utf8')},sid);
  const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'carta_referencia.json'),'utf8'));fixture.rarity='Common'; // TCGdex devuelve a veces la rareza en ingles.
  await cmd('Page.addScriptToEvaluateOnNewDocument',{source:`const referenceFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('api.tcgdex.net/v2/es/cards/me02-001')?Promise.resolve(new Response(JSON.stringify(${JSON.stringify(fixture)}),{status:200,headers:{'Content-Type':'application/json'}})):referenceFetch(url,options);`},sid);
  const evalJS=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sid);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async expression=>{for(let i=0;i<100;i++){try{if(await evalJS(expression))return;}catch(_){}await new Promise(r=>setTimeout(r,70));}const pista=await evalJS("JSON.stringify({estado:document.getElementById('editor-status').textContent,ocupado:tcgSesion.busy,paneles:[document.getElementById('detail-pane').hidden,document.getElementById('editor-pane').hidden],guardar:document.getElementById('save-card').disabled,url:location.href.slice(-30),cartas:catalogoApp.getData().length})").catch(()=>'');throw Error('Espera agotada: '+expression+' | '+pista+' | '+errors.join(';'));};
  const page=pathToFileURL(path.join(root,'catalogo_cartas.html')).href;
  await cmd('Page.navigate',{url:page+'?scenario=owner'},sid);await wait('window.tcgAccount?.isAdmin');
  await evalJS(`(()=>{const a=(v,s)=>{if(!v)throw Error(s)},app=window.catalogoApp;
   a(app.getData().length===177,'Inventario');a(app.getData().reduce((n,c)=>n+c.cantidad,0)===178,'Cantidades');
   a(getComputedStyle(document.getElementById('cards')).gridTemplateColumns.split(' ').length===5,'Columnas');
   a(parseFloat(getComputedStyle(document.querySelector('.card-name')).fontSize)>=18,'Fuente nombre');
   a(parseFloat(getComputedStyle(document.querySelector('.card-meta')).fontSize)>=13,'Fuente metadatos');
   const logo=document.querySelector('.brand-symbol').getBoundingClientRect(),name=document.getElementById('brand-name').getBoundingClientRect();
   a(Math.abs((logo.top+logo.height/2)-(name.top+name.height/2))<1,'Logo desalineado');
   for(const [lang,count] of [['japones',63],['espa\u00f1ol',62],['coreano',52]]){document.querySelector('[data-language="'+lang+'"]').click();a(app.getVisible().length===count,'Idioma');}app.reset();
   a(!/precio|price/i.test(document.body.textContent),'Precios');
   for(const id of ['type','rarity']){const labels=[...document.getElementById(id).options].map(o=>o.textContent);a(labels.length===new Set(labels).size,'Opciones repetidas en '+id);}
   a(![...document.getElementById('type').options].some(o=>['Incoloro','Oscuridad','Metálico'].includes(o.value)),'Sinonimos de tipo');
   const sinCruz=document.querySelector('[data-open="c089"]');a(sinCruz && !document.querySelector('.missing-picture'),'Las fotos propias no llevan cruz');sinCruz.click();a(document.querySelector('.image-origin').textContent.startsWith('Foto propia'),'Etiqueta de foto propia');a(!document.querySelector('.detail-photo>img.scan'),'Foto propia redondeada');document.getElementById('close-detail').click();
   const escaneo=document.querySelector('[data-id="c006"] .card-picture'),foto=document.querySelector('[data-id="c089"] .card-picture');a(escaneo.classList.contains('scan') && getComputedStyle(escaneo).borderTopLeftRadius.includes('%'),'Escaneo sin esquinas redondeadas');a(!foto.classList.contains('scan') && getComputedStyle(foto).borderTopLeftRadius==='6px','Foto propia modificada');
   document.getElementById('account-button').click();
   a(document.querySelectorAll('#avatar-options [data-avatar]').length===8,'Ocho avatares');
   const dlgCuenta=document.getElementById('account-dialog');document.getElementById('username').value='Cambio sin guardar';document.getElementById('username').dispatchEvent(new Event('input',{bubbles:true}));
   dlgCuenta.querySelector('.close-button').click();a(dlgCuenta.open && !dlgCuenta.querySelector('.discard-bar').hidden,'Cuenta sin aviso de cambios');
   dlgCuenta.querySelector('[data-act=keep]').click();
   document.querySelector('#avatar-options [data-avatar="a5"]').click();document.getElementById('username').value='Mi nombre guardado';document.getElementById('profile-form').requestSubmit();
  })()`);
  await wait('document.getElementById("brand-name").textContent==="Mi nombre guardado"');
  await wait('document.querySelector("#account-button img")?.getAttribute("src").endsWith("a5.png")');
  await cmd('Page.reload',{},sid);await wait('document.getElementById("brand-name").textContent==="Mi nombre guardado"');
  await wait('document.querySelector("#account-button img")?.getAttribute("src").endsWith("a5.png")');
  await evalJS(`(async()=>{await tcgAccount.openEditor('c165');if(!document.getElementById('card-category').disabled||!document.getElementById('card-type').disabled)throw Error('Identidad editable en ficha existente');document.getElementById('card-form').elements.cantidad.value=2;document.getElementById('card-form').requestSubmit();})()`);
  await wait('!document.getElementById("detail-dialog").open');
  // Detalle y editor lado a lado; aviso al salir con cambios (X, Esc y clic fuera).
  await evalJS(`(async()=>{
   const dormir=ms=>new Promise(r=>setTimeout(r,ms)),dlg=document.getElementById('detail-dialog'),bar=()=>dlg.querySelector('.discard-bar'),cantidad=id=>catalogoApp.getData().find(c=>c.id===id).cantidad;
   const abrir=async()=>{catalogoApp.openDetail('c160');document.querySelector('.detail-edit').click();await dormir(900);};
   await abrir();
   const d=document.getElementById('detail-pane').getBoundingClientRect(),e=document.getElementById('editor-pane').getBoundingClientRect();
   if(!(d.right<=e.left+2 && Math.abs(d.top-e.top)<2 && d.width>300 && e.width>300))throw Error('El editor no esta a la derecha del detalle '+JSON.stringify([d.left,d.right,d.top,d.width,e.left,e.right,e.top,e.width,innerWidth]));
   dlg.querySelector('.close-button').click();await dormir(100);
   if(dlg.open)throw Error('Sin cambios debe cerrar sin avisar');
   await abrir();const f=document.getElementById('card-form');
   const tocar=v=>{f.elements.cantidad.value=v;f.elements.cantidad.dispatchEvent(new Event('input',{bubbles:true}));};
   tocar(9);
   dlg.querySelector('.close-button').click();await dormir(100);
   if(!dlg.open||bar().hidden)throw Error('La X debe avisar de los cambios');
   bar().querySelector('[data-act=keep]').click();if(!bar().hidden||!dlg.open)throw Error('Seguir editando');
   dlg.dispatchEvent(new Event('cancel',{cancelable:true}));
   if(!dlg.open||bar().hidden)throw Error('Esc debe avisar de los cambios');
   bar().querySelector('[data-act=keep]').click();
   dlg.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:1,clientY:1}));
   if(!dlg.open||bar().hidden)throw Error('Clic fuera debe avisar de los cambios');
   bar().querySelector('[data-act=discard]').click();await dormir(100);
   if(dlg.open||cantidad('c160')!==1)throw Error('Descartar debe cerrar sin guardar');
   await abrir();tocar(3);
   dlg.querySelector('.close-button').click();await dormir(100);
   bar().querySelector('[data-act=save]').click();await dormir(1500);
   if(cantidad('c160')!==3)throw Error('Guardar desde el aviso no guarda');
   if(!dlg.open||document.querySelector('.detail-info dd:last-of-type')===null)throw Error('Tras guardar vuelve al detalle');
   dlg.querySelector('.close-button').click();await dormir(100);
   if(dlg.open)throw Error('Debe cerrar sin avisar tras guardar');
  })()`);
  await evalJS(`(async()=>{if(catalogoApp.getData().find(c=>c.id==='c165').cantidad!==2)throw Error('No guarda cantidad');if(catalogoApp.getData().length!==177)throw Error('Foto crea copia');await tcgAccount.openEditor();})()`);
  await evalJS(`(()=>{const f=document.getElementById('card-form');if(f.elements.variante||f.elements.motivo_pendiente||f.elements.pendiente||f.elements.rareza)throw Error('Campos manuales sobrantes');try{tcgRegistry.getCard();throw Error('Acepta carta inventada');}catch(e){if(e.message==='Acepta carta inventada')throw e;}const search=document.getElementById('set-search');search.value='PFL';search.dispatchEvent(new Event('input'));})()`);
  await evalJS(`document.querySelector('#set-options .combo-option').click();const input=document.getElementById('pokemon-search');input.value='Odd';input.dispatchEvent(new Event('input'));`);
  await evalJS(`document.querySelector('#card-matches .card-match').click();`);
  await wait('window.tcgRegistry.selected?.catalogo_id==="me02-001"');
  await evalJS(`if(tcgRegistry.getCard().tipo!=='Planta')throw Error('Tipo de referencia incorrecto');if(tcgRegistry.getCard().rareza!=='Común')throw Error('Rareza sin traducir');if(getComputedStyle(document.querySelector('.primary-button')).borderRadius!=='8px')throw Error('Botones sin redondear');const close=document.querySelector('#detail-dialog .close-button'),svg=close.querySelector('svg'),a=close.getBoundingClientRect(),b=svg.getBoundingClientRect();if(Math.abs(a.x+a.width/2-b.x-b.width/2)>1||Math.abs(a.y+a.height/2-b.y-b.height/2)>1)throw Error('X descentrada');`);
  const doc=await cmd('DOM.getDocument',{},sid),input=await cmd('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#card-photo'},sid);
  await cmd('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path.join(root,'imagenes_cartas','espa\u00f1ol','177_charizard_30c_clasica_4_102.jpg')]},sid);
  await wait('!document.getElementById("crop-controls").hidden');
  await evalJS(`document.getElementById('crop-zoom').value=2;document.getElementById('crop-zoom').dispatchEvent(new Event('input'));document.getElementById('card-form').requestSubmit();`);
  await wait('!document.getElementById("detail-dialog").open');
  await evalJS(`(()=>{const c=catalogoApp.getData().find(c=>c.catalogo_id==='me02-001');if(!c||!c.encuadre||c.encuadre.ancho_original!==1200)throw Error('No guarda foto completa y recorte');if(testDatabase.uploads.length!==1)throw Error('Fotos duplicadas');document.querySelector('[data-open="'+c.id+'"]').click();})()`);
  await evalJS(`if(document.querySelector('.detail-image img').classList.contains('cropped-photo'))throw Error('Detalle recortado');document.getElementById('close-detail').click();`);
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sid);
  await evalJS(`(()=>{const a=(v,t)=>{if(!v)throw Error(t)},cols=()=>getComputedStyle(document.getElementById('cards')).gridTemplateColumns.split(' ').length;
   a(cols()===3,'Movil: tres cartas por fila');
   document.querySelector('[data-view=list]').click();a(cols()===1 && document.getElementById('cards').classList.contains('view-list'),'Vista de lista');
   a(document.documentElement.scrollWidth<=innerWidth,'Lista desborda en movil');
   a(localStorage.getItem('tcg_vista')==='list','La vista no se recuerda');
   document.querySelector('[data-view=grid]').click();a(cols()===3,'Volver a la cuadricula');})()`);
  await evalJS(`if(document.documentElement.scrollWidth>innerWidth)throw Error('Desbordamiento movil');for(const id of ['search','sort','type'])if(parseFloat(getComputedStyle(document.getElementById(id)).fontSize)<16)throw Error('Campo movil menor de 16 px: '+id);document.getElementById('account-button').click();if(document.getElementById('account-dialog').scrollWidth>document.getElementById('account-dialog').clientWidth)throw Error('Cuenta desborda');document.querySelector('[data-close="account-dialog"]').click();`);
  await cmd('Page.navigate',{url:page+'?scenario=viewer'},sid);await wait('window.tcgAccount?.user && /^Entrenador\\d{4}$/.test(document.getElementById("brand-name").textContent)');
  await evalJS(`if(tcgAccount.isAdmin || !document.getElementById('import-catalogue').hidden)throw Error('Usuario normal con permisos de propietario');document.getElementById('account-button').click();document.getElementById('sign-out').click();`);
  await wait('document.getElementById("brand-name").textContent==="rodrytela"');
  await evalJS('localStorage.removeItem("tcg_prueba_remoto")');
  await cmd('Page.navigate',{url:page+'?scenario=anonymous'},sid);await wait('window.tcgAccount && window.catalogoApp');
  await evalJS(`if(!document.getElementById('add-card').hidden)throw Error('Anonimo editor');document.getElementById('account-button').click();`);
  // file:// impide OAuth de verdad; la interfaz debe explicarlo sin redirigir.
  await wait('!document.getElementById("connection-status").hidden');
  // Cerrar sesion debe funcionar aunque haya otra operacion en curso.
  await cmd('Page.navigate',{url:page+'?scenario=owner'},sid);await wait('window.tcgAccount?.isAdmin');
  await evalJS(`document.getElementById('account-button').click();document.getElementById('username').value='Otro nombre';document.getElementById('profile-form').requestSubmit();document.getElementById('header-sign-out').click();`);
  await wait('!window.tcgAccount.user && document.getElementById("brand-name").textContent==="rodrytela" && document.getElementById("add-card").hidden');
  await evalJS('localStorage.removeItem("tcg_prueba_remoto")');
  if(errors.length)throw Error(errors.join('; '));
  console.log('Interfaz: perfiles persistentes, nombre/Google, permisos de interfaz, edicion, subida con encuadre, filtros sin duplicados, salida con operacion en curso, 177 fichas y movil correctos.');
 }finally{await cmd('Browser.close').catch(()=>{});ws.close();clearTimeout(timer);}
}
child.stderr.on('data',chunk=>{stderr+=chunk;const m=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m&&!started){started=true;run(m[1]).catch(e=>{console.error(e.message);process.exitCode=1;clearTimeout(timer);child.kill();});}});
child.on('exit',()=>clearTimeout(timer));child.on('error',e=>{console.error(e.message);clearTimeout(timer);process.exitCode=1;});
