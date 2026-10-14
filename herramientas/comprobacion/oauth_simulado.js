(() => {
 const key='sb-jrdgqdczplvehzzyhgqx-auth-token',uid='11111111-1111-4111-8111-111111111111';
 const user={id:uid,aud:'authenticated',role:'authenticated',email:'adrianrodry55@gmail.com',app_metadata:{provider:'google',providers:['google']},user_metadata:{full_name:'Google original'},identities:[],created_at:new Date().toISOString()};
 const exp=Math.floor(Date.now()/1000)+3600;
 const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,exp,iat:exp-3600,role:'authenticated',aud:'authenticated',email:user.email})),'firma_de_prueba'].join('.');
 if(new URL(location.href).searchParams.has('code'))localStorage.setItem(key+'-code-verifier',JSON.stringify('verificador_solo_para_pruebas'));
 const original=window.fetch.bind(window);
 window.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:input.url;
  if(!url.includes('jrdgqdczplvehzzyhgqx.supabase.co'))return original(input,init);
  let result;
  if(url.includes('/auth/v1/token')){result={access_token:token,refresh_token:'refresh_solo_prueba',expires_in:3600,token_type:'bearer',user};localStorage.setItem('tcg_oauth_intercambiado','si');}
  else if(url.includes('/auth/v1/user')){
   if(localStorage.getItem('tcg_oauth_fallo_usuario'))return new Response(JSON.stringify({message:'Consulta del usuario temporalmente fallida',code:'unexpected_failure'}),{status:400,headers:{'Content-Type':'application/json'}});
   result=user;
  }
  else if(url.includes('/auth/v1/logout')&&localStorage.getItem('tcg_oauth_cuelga'))return new Promise(()=>{}); // El servidor nunca responde.
  else if(url.includes('/auth/v1/logout')&&localStorage.getItem('tcg_oauth_fallo_red'))throw new TypeError('Failed to fetch');
  else if(url.includes('/auth/v1/logout')&&localStorage.getItem('tcg_oauth_fallo_salida'))return new Response(JSON.stringify({message:'Servicio no disponible'}),{status:400,headers:{'Content-Type':'application/json'}});
  else if(url.includes('/rest/v1/tcg_profiles'))result=[{id:uid,username:'Nombre OAuth persistente'}];
  else if(url.includes('/rest/v1/rpc/tcg_is_admin'))result=true;
  else if(url.includes('/rest/v1/tcg_cards'))result=[];
  else result={};
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
})();
