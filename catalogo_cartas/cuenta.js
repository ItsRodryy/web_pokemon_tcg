'use strict';
(() => {
  const $=id=>document.getElementById(id),config=window.CATALOGO_CONFIG||{};
  const app=window.catalogoApp,initial=window.CATALOGO_DATA||[];
  const state={client:null,user:null,profile:null,isAdmin:false,busy:false,photo:null,photoUrl:null,crop:null,editing:null,authVersion:0,photoVersion:0,signingIn:false,signingOut:false};
  const authStorageKey=config.supabaseUrl?'sb-'+new URL(config.supabaseUrl).hostname.split('.')[0]+'-auth-token':'';
  const oauthReturn=new URL(location.href).searchParams.has('code')||location.hash.includes('error=');
  const message=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.dataset.error=String(error);};
  const errorText=e=>e?.code==='23505'?'Esta carta ya existe. Selecciónala arriba para actualizar su cantidad o su foto.':e?.message||'No se pudo completar. Inténtalo de nuevo.';
  const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'pendiente';
  function accountView(){
    const name=state.user?(state.profile?.username||state.user.user_metadata?.full_name||'Entrenador'):'rodrytela';
    $('brand-name').textContent=name;$('brand-name').title=name;
    $('account-button').textContent=state.user?'Tu cuenta':'Entrar con Google';
    $('header-sign-out').hidden=!state.user;
    $('add-card').hidden=!state.isAdmin;$('import-catalogue').hidden=!state.isAdmin;
    $('account-email').textContent=state.user?.email||'';
    document.title=name+' · Pokémon TCG';
  }
  async function loadCards(){
    if(!state.client)return;
    const cards=[];
    for(let start=0;;start+=1000){
      const {data,error}=await state.client.from('tcg_cards').select('datos').order('id').range(start,start+999);
      if(error)throw error;
      for(const row of data){const c=row.datos;if(c && typeof c.id==='string' && ['japones','español','coreano'].includes(c.idioma) && Number.isInteger(c.cantidad) && c.cantidad>0 && validImage(c.imagen))cards.push(c);}
      if(data.length<1000)break;
    }
    app.replaceRemote(cards);$('connection-status').hidden=true;
  }
  function validImage(src){
    if(typeof src!=='string')return false;
    if(/^imagenes_cartas\/(japones|español|coreano|pendientes)\/[a-z0-9_]+\.(jpg|jpeg|png|webp)$/.test(src))return true;
    try{const u=new URL(src),base=new URL(config.supabaseUrl);return u.protocol==='https:' && u.origin===base.origin && u.pathname.startsWith('/storage/v1/object/public/'+config.bucket+'/');}catch(_){return false;}
  }
  async function signedUser(){
    if(state.signingOut)return;
    const version=++state.authVersion;
    const cached=await state.client.auth.getSession();
    if(version!==state.authVersion||state.signingOut)return;
    const cachedUser=cached.data?.session?.user||null;
    if(cachedUser && !state.user){state.user=cachedUser;state.profile=null;state.isAdmin=false;accountView();}
    const {data,error}=await state.client.auth.getUser();
    if(version!==state.authVersion||state.signingOut)return;
    if(error && cachedUser){
      state.isAdmin=false;accountView();$('connection-status').hidden=false;$('connection-status').textContent='Tu sesión está guardada, pero no se pudo comprobar el acceso. '+errorText(error)+' Puedes cerrar sesión desde la cabecera.';return;
    }
    const next=error?null:data.user,same=!!next && state.user?.id===next.id;
    state.user=next;if(!same){state.profile=null;state.isAdmin=false;}accountView();
    if(error && oauthReturn){$('connection-status').hidden=false;$('connection-status').textContent='No se pudo recuperar tu sesión. '+errorText(error)+' Vuelve a pulsar Entrar con Google.';}
    if(!state.user)return;
    try{
      const user=state.user;
      let {data:profile,error:profileError}=await state.client.from('tcg_profiles').select('id,username').eq('id',user.id).maybeSingle();
      if(profileError)throw profileError;
      if(!profile){
        const username=Array.from(String(user.user_metadata?.full_name||'Entrenador').trim()).slice(0,40).join('');
        const result=await state.client.from('tcg_profiles').upsert({id:user.id,username},{onConflict:'id',ignoreDuplicates:true});
        if(result.error)throw result.error;
        const fetched=await state.client.from('tcg_profiles').select('id,username').eq('id',user.id).single();
        if(fetched.error)throw fetched.error;profile=fetched.data;
      }
      const admin=await state.client.rpc('tcg_is_admin');if(admin.error)throw admin.error;
      if(version!==state.authVersion)return;
      state.profile=profile;state.isAdmin=admin.data===true;accountView();
    }catch(e){if(version===state.authVersion)message('profile-status','No se pudo cargar tu perfil. '+errorText(e),true);}
  }
  async function signIn(){
    if(state.signingIn)return;
    if(!state.client){$('connection-status').hidden=false;$('connection-status').textContent='El acceso con Google todavía se está preparando.';return;}
    if(!['https:','http:'].includes(location.protocol)){$('connection-status').hidden=false;$('connection-status').textContent='Para iniciar sesión abre la versión publicada del catálogo.';return;}
    const redirect=config.redirectUrl||new URL('catalogo_cartas.html',location.href).href;
    state.signingIn=true;$('account-button').disabled=true;
    try{
      const {error}=await state.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,queryParams:{prompt:'select_account'}}});
      if(error)throw error;
    }catch(error){state.signingIn=false;$('account-button').disabled=false;$('connection-status').hidden=false;$('connection-status').textContent='No se pudo entrar con Google. '+errorText(error);}
  }
  window.addEventListener('pageshow',()=>{state.signingIn=false;$('account-button').disabled=false;});
  $('account-button').addEventListener('click',()=>{
    if(!state.user){signIn();return;}
    $('username').value=state.profile?.username||state.user.user_metadata?.full_name||'';
    $('account-dialog').showModal();
  });
  $('profile-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!state.user||state.busy)return;
    const username=$('username').value.trim().replace(/\s+/g,' ');
    if(!username || Array.from(username).length>40){message('profile-status','Escribe un nombre de entre 1 y 40 caracteres.',true);return;}
    state.busy=true;const button=event.submitter||event.currentTarget.querySelector('[type="submit"]');button.disabled=true;message('profile-status','Guardando…');
    try{
      const userId=state.user.id;
      const {data,error}=await state.client.from('tcg_profiles').update({username}).eq('id',userId).select('id,username').single();
      if(error)throw error;
      if(state.user?.id===userId){state.profile=data;accountView();message('profile-status','Nombre guardado en tu cuenta.');}
    }catch(e){message('profile-status',errorText(e),true);}finally{state.busy=false;button.disabled=false;}
  });
  function forgetLocalSession(){
    // Salida local explicita incluso si el servicio no responde. Solo claves
    // de autenticacion de este proyecto; nunca borrar otros datos o cuentas.
    for(const key of [authStorageKey,authStorageKey+'-code-verifier',authStorageKey+'-user']){try{localStorage.removeItem(key);}catch(_){/* almacenamiento bloqueado */}}
  }
  async function signOut(){
    // La salida no espera a otras operaciones: debe estar siempre disponible.
    if(state.signingOut||!state.client)return;
    state.signingOut=true;state.authVersion++;state.isAdmin=false;accountView();
    $('sign-out').disabled=true;$('header-sign-out').disabled=true;
    let fallback=false;
    try{
      const {error}=await state.client.auth.signOut({scope:'local'});
      if(error)throw error;
    }catch(_){
      fallback=true;
      try{await state.client.auth.stopAutoRefresh();}catch(_){/* se recarga igualmente */}
      forgetLocalSession();
    }
    state.authVersion++;state.user=null;state.profile=null;state.isAdmin=false;state.busy=false;accountView();
    if($('account-dialog').open)$('account-dialog').close();
    if($('editor-dialog').open)$('editor-dialog').close();
    $('connection-status').hidden=false;$('connection-status').textContent='Has cerrado tu sesión en esta web.';
    message('profile-status','');
    state.signingOut=false;$('sign-out').disabled=false;$('header-sign-out').disabled=false;
    // Recargar garantiza que el cliente no conserve en memoria la sesion borrada.
    if(fallback)location.reload();
  }
  $('sign-out').addEventListener('click',signOut);$('header-sign-out').addEventListener('click',signOut);
  $('import-catalogue').addEventListener('click',async()=>{
    if(!state.isAdmin||state.busy)return;
    state.busy=true;$('import-catalogue').disabled=true;message('profile-status','Sincronizando las cartas iniciales…');
    try{
      const {error}=await state.client.from('tcg_cards').upsert(initial.map(c=>({id:c.id,datos:c})),{onConflict:'id',ignoreDuplicates:true});
      if(error)throw error;await loadCards();message('profile-status','Colección inicial sincronizada. Las fichas ya guardadas se han conservado.');
    }catch(e){message('profile-status',errorText(e),true);}finally{state.busy=false;$('import-catalogue').disabled=false;}
  });
  const fields=['cantidad','notas'];
  function releasePhoto(){state.photoVersion++;if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);state.photo=null;state.photoUrl=null;state.crop=null;$('crop-controls').hidden=true;$('card-photo').value='';$('crop-image').removeAttribute('src');}
  async function fillEditor(id){
    releasePhoto();$('card-form').reset();state.editing=app.getData().find(c=>c.id===id)||null;
    $('edit-existing').value=state.editing?.id||'';
    $('editor-title').textContent=state.editing?'Actualizar carta':'Añadir carta';
    if(state.editing)fields.forEach(k=>$('card-form').elements[k].value=state.editing[k]??'');
    else $('card-form').elements.cantidad.value='1';
    message('editor-status','');
    $('save-card').disabled=true;
    try{await window.tcgRegistry.prepare();window.tcgRegistry.setExisting(state.editing);}
    catch(e){message('editor-status',errorText(e),true);return;}
    $('save-card').disabled=false;
  }
  async function openEditor(id=''){
    if(!state.isAdmin)return;
    const select=$('edit-existing');select.replaceChildren(new Option('Nueva carta',''));
    app.getData().slice().sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')).forEach(c=>select.add(new Option(`${c.nombre} · ${c.numero} · ${c.idioma}`,c.id)));
    $('editor-dialog').showModal();await fillEditor(id);
  }
  $('add-card').addEventListener('click',()=>openEditor());
  $('edit-existing').addEventListener('change',()=>fillEditor($('edit-existing').value));
  function updateCrop(){
    if(!state.photo)return;
    const {width:W,height:H}=state.photo,ratio=1104/1504,zoom=Number($('crop-zoom').value);
    const w=Math.min(W,H*ratio)/zoom,h=w/ratio;
    state.crop={x:(W-w)*Number($('crop-x').value)/100,y:(H-h)*Number($('crop-y').value)/100,ancho:w,alto:h,ancho_original:W,alto_original:H};
    const r=state.crop;
    $('crop-image').style.cssText=`width:${100*W/w}%;height:${100*H/h}%;left:${-100*r.x/w}%;top:${-100*r.y/h}%;`;
  }
  ['crop-zoom','crop-x','crop-y'].forEach(id=>$(id).addEventListener('input',updateCrop));
  $('card-photo').addEventListener('change',async()=>{
    const file=$('card-photo').files[0];if(!file){releasePhoto();return;}
    releasePhoto();
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024){message('editor-status','Usa JPG, PNG o WebP de hasta 15 MB. Para HEIC, exporta la foto como JPEG.',true);return;}
    const url=URL.createObjectURL(file),img=new Image(),version=state.photoVersion;img.src=url;
    try{await img.decode();if(version!==state.photoVersion){URL.revokeObjectURL(url);return;}state.photo={file,width:img.naturalWidth,height:img.naturalHeight};state.photoUrl=url;$('crop-image').src=url;$('crop-controls').hidden=false;$('crop-zoom').value=1;$('crop-x').value=50;$('crop-y').value=50;updateCrop();message('editor-status','');}
    catch(_){URL.revokeObjectURL(url);message('editor-status','No se pudo abrir la fotografía.',true);}
  });
  $('card-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!state.isAdmin||state.busy)return;
    const form=event.currentTarget,values=Object.fromEntries(fields.map(k=>[k,form.elements[k].value.trim()]));
    let identity;
    try{identity=window.tcgRegistry.getCard();}catch(e){message('editor-status',errorText(e),true);return;}
    const quantity=Number(values.cantidad);
    if(!Number.isInteger(quantity)||quantity<1||quantity>9999){message('editor-status','La cantidad debe ser un número entero entre 1 y 9999.',true);return;}
    if(!state.editing && !state.photo){message('editor-status','Añade una fotografía de la nueva carta.',true);return;}
    const number=v=>String(v||'').split('/')[0].replace(/^0+(?=\d)/,'').toLowerCase();
    const same=app.getData().find(c=>c.id!==state.editing?.id && c.idioma===identity.idioma && ((c.catalogo_id&&c.catalogo_id===identity.catalogo_id)||(String(c.codigo).toLowerCase()===String(identity.codigo).toLowerCase()&&number(c.numero)===number(identity.numero)&&!!identity.codigo)));
    if(same){message('editor-status','Esta carta ya tiene ficha. Selecciónala arriba para cambiar su cantidad o fotografía.',true);return;}
    const card={...identity,...values,id:state.editing?.id||'c_'+crypto.randomUUID().replaceAll('-','_'),cantidad:quantity};
    if(!state.editing){card.pendiente=false;card.cantidad_provisional=false;card.motivo_pendiente='';}
    card.ids_unidades=state.editing?.ids_unidades||[card.id];card.rareza ||= 'Por confirmar';card.tipo ||= 'Por confirmar';
    if(!card.pendiente)card.motivo_pendiente='';
    card.estado ||= 'Frontal fotografiado; reverso no disponible; estado global pendiente.';
    state.busy=true;$('save-card').disabled=true;message('editor-status','Guardando carta…');let uploaded=null;
    try{
      if(state.photo){
        const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[state.photo.file.type];
        uploaded=`${state.user.id}/${slug(card.idioma)}/${Date.now()}_${slug(card.nombre)}_${slug(card.codigo)}_${slug(card.numero)}_${crypto.randomUUID().slice(0,8)}.${ext}`;
        const {error}=await state.client.storage.from(config.bucket).upload(uploaded,state.photo.file,{contentType:state.photo.file.type,upsert:false});if(error)throw error;
        card.imagen=state.client.storage.from(config.bucket).getPublicUrl(uploaded).data.publicUrl;
        card.encuadre={...state.crop};card.imagen_origen='foto_propia';card.imagen_fuente=state.photo.file.name;card.imagen_url=null;card.imagen_faltante=false;card.recorte_metodo='encuadre_visual_sin_modificar_original';delete card.contorno_normalizado;
      }
      if(!validImage(card.imagen))throw Error('La fotografía no tiene una dirección válida.');
      const {error}=await state.client.from('tcg_cards').upsert({id:card.id,datos:card},{onConflict:'id'});if(error)throw error;
      uploaded=null;
      app.replaceRemote([...app.getData(),card]);$('editor-dialog').close();releasePhoto();
      try{await loadCards();}catch(_){$('connection-status').hidden=false;$('connection-status').textContent='Carta guardada. No se pudo recargar el resto de la colección; puedes actualizar la página más tarde.';}
    }catch(e){
      if(uploaded){const removed=await state.client.storage.from(config.bucket).remove([uploaded]);if(removed.error)message('editor-status','No se guardó la ficha; la foto subida necesita revisarse. '+errorText(e),true);else message('editor-status',errorText(e),true);}
      else message('editor-status',errorText(e),true);
    }finally{state.busy=false;$('save-card').disabled=false;}
  });
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(!state.busy)$(b.dataset.close).close();}));
  ['account-dialog','editor-dialog'].forEach(id=>$(id).addEventListener('cancel',event=>{if(state.busy)event.preventDefault();}));
  $('editor-dialog').addEventListener('close',releasePhoto);
  window.tcgAccount={get isAdmin(){return state.isAdmin;},get user(){return state.user;},openEditor,reload:loadCards};
  accountView();
  if(config.supabaseUrl && config.supabaseKey && window.supabase){
    state.client=window.supabase.createClient(config.supabaseUrl,config.supabaseKey,{auth:{storageKey:authStorageKey,flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
    state.client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){state.authVersion++;state.user=null;state.profile=null;state.isAdmin=false;accountView();if($('account-dialog').open)$('account-dialog').close();if($('editor-dialog').open&&!state.busy)$('editor-dialog').close();return;}
      if(session?.user&&!state.user){state.user=session.user;accountView();}
      setTimeout(()=>signedUser().catch(()=>{}),0);
    });
    state.client.auth.initialize().then(({error})=>{
      if(error){$('connection-status').hidden=false;$('connection-status').textContent='No se pudo completar el inicio de sesión. '+errorText(error)+' Vuelve a pulsar Entrar con Google.';}
      else signedUser().catch(()=>{});
    });
    loadCards().catch(()=>{$('connection-status').hidden=false;$('connection-status').textContent='No se pudo actualizar la colección. Mostrando las cartas guardadas.';});
  }
})();
