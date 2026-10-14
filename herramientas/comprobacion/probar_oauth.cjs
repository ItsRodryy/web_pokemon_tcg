const {spawn}=require('node:child_process'),http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404).end();return;}const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream';res.setHeader('Content-Type',type);fs.createReadStream(p).pipe(res);});
server.listen(0,'127.0.0.1',()=>start(server.address().port));
function start(port){
 const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0','--no-first-run','--disable-background-networking','--user-data-dir='+path.join(__dirname,'perfil_oauth'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let ws,n=0,stderr='',started=false;const calls=new Map(),errors=[];
 const timer=setTimeout(()=>{child.kill();server.close();process.exitCode=1;},40000);
 async function run(url){
  ws=new WebSocket(url);await new Promise(r=>ws.onopen=r);
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const c=calls.get(m.id);calls.delete(m.id);m.error?c.reject(Error(JSON.stringify(m.error))):c.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
  const cmd=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++n;calls.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  try{
   const t=await cmd('Target.createTarget',{url:'about:blank'}),sid=(await cmd('Target.attachToTarget',{targetId:t.targetId,flatten:true})).sessionId;
   await cmd('Runtime.enable',{},sid);await cmd('Page.enable',{},sid);await cmd('Network.enable',{},sid);
   await cmd('Network.setBlockedURLs',{urls:['*supabase.co*']},sid);
   await cmd('Page.addScriptToEvaluateOnNewDocument',{source:fs.readFileSync(path.join(__dirname,'oauth_simulado.js'),'utf8')},sid);
   const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
   const wait=async expression=>{for(let i=0;i<100;i++){try{if(await evaluate(expression))return;}catch(_){}await new Promise(r=>setTimeout(r,70));}throw Error('Espera agotada: '+expression+' | '+errors.join(';'));};
   await cmd('Page.navigate',{url:`http://127.0.0.1:${port}/index.html?code=prueba_oauth`},sid);
   await wait('window.tcgAccount?.isAdmin && document.getElementById("brand-name")?.textContent==="Nombre OAuth persistente"');
   await evaluate(`if(localStorage.getItem('tcg_oauth_intercambiado')!=='si')throw Error('No intercambia PKCE');if(!localStorage.getItem('sb-jrdgqdczplvehzzyhgqx-auth-token'))throw Error('No guarda sesion');`);
   await cmd('Page.reload',{},sid);
   await wait('window.tcgAccount?.isAdmin && document.getElementById("account-button")?.textContent==="Tu cuenta"');
   await evaluate(`if(document.getElementById('header-sign-out').hidden)throw Error('Sin salida directa');localStorage.setItem('tcg_oauth_fallo_usuario','si');`);
   await cmd('Page.reload',{},sid);
   await wait('window.tcgAccount?.user && !window.tcgAccount.isAdmin && !document.getElementById("header-sign-out").hidden && document.getElementById("connection-status").textContent.includes("no se pudo comprobar")');
   await evaluate(`document.getElementById('header-sign-out').click();`);
   await wait('!window.tcgAccount.user && !localStorage.getItem("sb-jrdgqdczplvehzzyhgqx-auth-token")');
   await evaluate(`localStorage.removeItem('tcg_oauth_fallo_usuario');`);
   await cmd('Page.reload',{},sid);
   await wait('window.tcgAccount && document.getElementById("account-button").textContent==="Entrar con Google" && document.getElementById("header-sign-out").hidden');
   await cmd('Page.navigate',{url:`http://127.0.0.1:${port}/index.html?code=prueba_oauth_salida`},sid);
   await wait('window.tcgAccount?.isAdmin');
   await evaluate(`localStorage.setItem('tcg_oauth_fallo_salida','si');document.getElementById('header-sign-out').click();`);
   await wait('window.tcgAccount && !window.tcgAccount.user && !localStorage.getItem("sb-jrdgqdczplvehzzyhgqx-auth-token")');
   await evaluate(`localStorage.removeItem('tcg_oauth_fallo_salida');`);
   // Sin red al cerrar: salida local igualmente y sigue cerrada tras recargar.
   await cmd('Page.navigate',{url:`http://127.0.0.1:${port}/index.html?code=prueba_oauth_red`},sid);
   await wait('window.tcgAccount?.isAdmin');
   await evaluate(`localStorage.setItem('tcg_oauth_fallo_red','si');document.getElementById('header-sign-out').click();`);
   await wait('window.tcgAccount && !window.tcgAccount.user && !localStorage.getItem("sb-jrdgqdczplvehzzyhgqx-auth-token")');
   await evaluate(`localStorage.removeItem('tcg_oauth_fallo_red');`);
   await cmd('Page.navigate',{url:`http://127.0.0.1:${port}/catalogo_cartas.html`},sid);
   await wait('window.tcgAccount && document.getElementById("account-button").textContent==="Entrar con Google" && document.getElementById("header-sign-out").hidden');
   if(errors.length)throw Error(errors.join(';'));
   console.log('SDK Supabase real: PKCE, sesion persistente, salida directa, salida con error de usuario/servicio/red y recarga sin sesion correctos.');
  }finally{await cmd('Browser.close').catch(()=>{});ws.close();clearTimeout(timer);server.close();}
 }
 child.stderr.on('data',b=>{stderr+=b;const m=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m&&!started){started=true;run(m[1]).catch(e=>{console.error(e.message);process.exitCode=1;clearTimeout(timer);child.kill();server.close();});}});
 child.on('error',e=>{console.error(e.message);clearTimeout(timer);server.close();process.exitCode=1;});
}
