// Ayudante para las pruebas de interfaz: abre Chrome con un perfil nuevo, bloquea los servicios
// reales y simula Supabase. Uso: await probar('nombre', async ctx => { ... }).
const {spawn} = require('node:child_process'), path = require('node:path'), fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../..');

async function probar(nombre, cuerpo, limite = 90000) {
  const perfil = path.join(__dirname, 'perfil_' + nombre);
  fs.rmSync(perfil, {recursive: true, force: true}); // Cada ejecución parte de un perfil limpio.
  const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--remote-debugging-port=0', '--no-first-run', '--disable-background-networking', '--window-size=1440,1100', '--force-device-scale-factor=1', '--user-data-dir=' + perfil, 'about:blank'],
    {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
  const errores = [], pendientes = new Map(); let ws, n = 0, buffer = '';
  const salido = new Promise(resolve => child.on('exit', resolve));
  const temporizador = setTimeout(() => { child.kill(); console.error('Tiempo agotado'); process.exitCode = 1; }, limite);
  const url = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.stderr.on('data', trozo => { buffer += trozo; const m = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) resolve(m[1]); });
  });
  ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pendientes.get(m.id); pendientes.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  const cmd = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++n; pendientes.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})})); });
  try {
    const t = await cmd('Target.createTarget', {url: 'about:blank'}), sid = (await cmd('Target.attachToTarget', {targetId: t.targetId, flatten: true})).sessionId;
    await cmd('Runtime.enable', {}, sid); await cmd('Page.enable', {}, sid); await cmd('Network.enable', {}, sid);
    await cmd('Network.setBlockedURLs', {urls: ['*supabase.co*', '*api.tcgdex.net*', '*assets.tcgdex.net*', '*prod.daldagury.com*']}, sid);
    await cmd('Page.addScriptToEvaluateOnNewDocument', {source: fs.readFileSync(path.join(__dirname, 'supabase_simulado.js'), 'utf8')}, sid);
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'carta_referencia.json'), 'utf8')); fixture.rarity = 'Common';
    await cmd('Page.addScriptToEvaluateOnNewDocument', {source: `const referenceFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('api.tcgdex.net/v2/es/cards/me02-001')?Promise.resolve(new Response(JSON.stringify(${JSON.stringify(fixture)}),{status:200,headers:{'Content-Type':'application/json'}})):referenceFetch(url,options);`}, sid);
    const evalJS = async expresion => { const r = await cmd('Runtime.evaluate', {expression: expresion, awaitPromise: true, returnByValue: true}, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const esperar = async expresion => {
      for (let i = 0; i < 150; i++) { try { if (await evalJS(expresion)) return; } catch (_) { /* aún no está */ } await new Promise(r => setTimeout(r, 80)); }
      throw new Error('Espera agotada: ' + expresion + ' | ' + errores.join(';'));
    };
    const abrir = async (escenario, extra = '') => { await cmd('Page.navigate', {url: pathToFileURL(path.join(root, 'catalogo_cartas.html')).href + '?scenario=' + escenario + extra}, sid); await esperar('window.catalogoApp && window.tcgAccount && window.tcgColeccion'); };
    const tamano = (width, height, mobile = false) => cmd('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile}, sid);
    await cuerpo({cmd, sid, evalJS, esperar, abrir, tamano, errores, root});
    if (errores.length) throw new Error(errores.join('; '));
  } finally {
    await cmd('Browser.close').catch(() => {}); ws.close(); clearTimeout(temporizador);
    await Promise.race([salido, new Promise(r => setTimeout(r, 5000))]);
    for (let intento = 0; intento < 5; intento++) { try { fs.rmSync(perfil, {recursive: true, force: true}); break; } catch (_) { await new Promise(r => setTimeout(r, 800)); } }
  }
}
module.exports = {probar};
