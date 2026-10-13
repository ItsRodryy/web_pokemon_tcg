const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
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
  const evalJS=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sid);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async expression=>{for(let i=0;i<100;i++){try{if(await evalJS(expression))return;}catch(_){}await new Promise(r=>setTimeout(r,70));}throw Error('Espera agotada: '+expression);};
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
   document.getElementById('account-button').click();document.getElementById('username').value='Mi nombre guardado';document.getElementById('profile-form').requestSubmit();
  })()`);
  await wait('document.getElementById("brand-name").textContent==="Mi nombre guardado"');
  await cmd('Page.reload',{},sid);await wait('document.getElementById("brand-name").textContent==="Mi nombre guardado"');
  await evalJS(`tcgAccount.openEditor('c165');document.getElementById('card-form').elements.cantidad.value=2;document.getElementById('card-form').requestSubmit();`);
  await wait('!document.getElementById("editor-dialog").open');
  await evalJS(`if(catalogoApp.getData().find(c=>c.id==='c165').cantidad!==2)throw Error('No guarda cantidad');if(catalogoApp.getData().length!==177)throw Error('Foto crea copia');tcgAccount.openEditor();const f=document.getElementById('card-form');for(const [k,v]of Object.entries({nombre:'Carta prueba',numero:'001/001',codigo:'TEST',expansion:'Expansion prueba',rareza:'Rara',tipo:'Fuego',variante:'normal',cantidad:'1'}))f.elements[k].value=v;`);
  const doc=await cmd('DOM.getDocument',{},sid),input=await cmd('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#card-photo'},sid);
  await cmd('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path.join(root,'imagenes_cartas','espa\u00f1ol','177_charizard_30c_clasica_4_102.jpg')]},sid);
  await wait('!document.getElementById("crop-controls").hidden');
  await evalJS(`document.getElementById('crop-zoom').value=2;document.getElementById('crop-zoom').dispatchEvent(new Event('input'));document.getElementById('card-form').requestSubmit();`);
  await wait('!document.getElementById("editor-dialog").open');
  await evalJS(`(()=>{const c=catalogoApp.getData().find(c=>c.nombre==='Carta prueba');if(!c||!c.encuadre||c.encuadre.ancho_original!==1200)throw Error('No guarda foto completa y recorte');if(testDatabase.uploads.length!==1)throw Error('Fotos duplicadas');document.querySelector('[data-open="'+c.id+'"]').click();})()`);
  await evalJS(`if(document.querySelector('.detail-image img').classList.contains('cropped-photo'))throw Error('Detalle recortado');document.getElementById('close-detail').click();`);
  await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sid);
  await evalJS(`if(document.documentElement.scrollWidth>innerWidth)throw Error('Desbordamiento movil');document.getElementById('account-button').click();if(document.getElementById('account-dialog').scrollWidth>document.getElementById('account-dialog').clientWidth)throw Error('Cuenta desborda');document.querySelector('[data-close="account-dialog"]').click();`);
  await cmd('Page.navigate',{url:page+'?scenario=viewer'},sid);await wait('window.tcgAccount?.user && document.getElementById("brand-name").textContent==="Nombre de Google"');
  await evalJS(`if(tcgAccount.isAdmin || !document.getElementById('add-card').hidden)throw Error('Visitante con edicion');document.getElementById('account-button').click();document.getElementById('sign-out').click();`);
  await wait('document.getElementById("brand-name").textContent==="rodrytela"');
  await evalJS('localStorage.removeItem("tcg_prueba_remoto")');
  await cmd('Page.navigate',{url:page+'?scenario=anonymous'},sid);await wait('window.tcgAccount && window.catalogoApp');
  await evalJS(`if(!document.getElementById('add-card').hidden)throw Error('Anonimo editor');document.getElementById('account-button').click();`);
  // file:// impide OAuth de verdad; la interfaz debe explicarlo sin redirigir.
  await wait('!document.getElementById("connection-status").hidden');
  if(errors.length)throw Error(errors.join('; '));
  console.log('Interfaz: perfiles persistentes, nombre/Google, permisos de interfaz, edicion, subida con encuadre, 177 fichas y movil correctos.');
 }finally{await cmd('Browser.close').catch(()=>{});ws.close();clearTimeout(timer);}
}
child.stderr.on('data',chunk=>{stderr+=chunk;const m=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m&&!started){started=true;run(m[1]).catch(e=>{console.error(e.message);process.exitCode=1;clearTimeout(timer);child.kill();});}});
child.on('exit',()=>clearTimeout(timer));child.on('error',e=>{console.error(e.message);clearTimeout(timer);process.exitCode=1;});
