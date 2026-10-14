// Supabase simulado para las pruebas de interfaz: perfiles, colección del propietario, colecciones
// de otras personas, Descubrir y moderación. Nunca se conecta a ningún servicio real.
(() => {
 const owner='11111111-1111-4111-8111-111111111111',viewer='22222222-2222-4222-8222-222222222222',ash='33333333-3333-4333-8333-333333333333',nobody='44444444-4444-4444-8444-444444444444';
 const scenario=new URL(location.href).searchParams.get('scenario')||'owner';
 const sinV2=new URL(location.href).searchParams.get('v2')==='off'; // SQL v2 aun sin aplicar
 const stored=localStorage.getItem('tcg_prueba_remoto');
 const fresh=()=>({
  profiles:{
   [owner]:{id:owner,username:'rodrytela',avatar:'a1',visible:true,oculto:false},
   [ash]:{id:ash,username:'Ash',avatar:'a2',visible:true,oculto:false},
   [nobody]:{id:nobody,username:'Sin cartas',avatar:'a4',visible:true,oculto:false}},
  cards:{},
  userCards:[
   {owner_id:ash,idioma:'español',catalogo_id:'me02-001',cantidad:2,tipo:'Planta',categoria:'Pokémon'},
   {owner_id:ash,idioma:'japones',catalogo_id:'SV4M-075',cantidad:1,tipo:null,categoria:null},
   {owner_id:ash,idioma:'coreano',catalogo_id:'dalda:5898',cantidad:3,tipo:null,categoria:null}],
  uploads:[],removed:[]});
 const db=stored?JSON.parse(stored):fresh();
 const persist=()=>localStorage.setItem('tcg_prueba_remoto',JSON.stringify(db));
 let user=scenario==='anonymous'?null:{id:scenario==='viewer'?viewer:owner,email:scenario==='viewer'?'viewer@example.com':'adrianrodry55@gmail.com',user_metadata:{full_name:'Nombre de Google'}};
 let callback=()=>{};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const isAdmin=()=>user?.id===owner;
 const keyOf=(row,cols)=>cols.map(c=>row[c]).join('|');
 class Query{
  constructor(table){this.table=table;this.operation='get';this.filters={};this.start=0;this.end=999;this.onConflict='id';}
  select(columnas){this.columnas=columnas||'';return this;}
  eq(k,v){this.filters[k]=v;return this;}
  order(){return this;}
  range(a,b){this.start=a;this.end=b;return this;}
  maybeSingle(){this.singleRow=true;return this;}
  single(){this.singleRow=true;return this;}
  upsert(data,options={}){this.operation='upsert';this.input=data;this.options=options;return this;}
  update(data){this.operation='update';this.input=data;return this;}
  delete(){this.operation='delete';return this;}
  rows(){
   if(this.table==='tcg_profiles')return Object.values(db.profiles);
   if(this.table==='tcg_user_cards')return db.userCards;
   return Object.values(db.cards);
  }
  match(row){return Object.entries(this.filters).every(([k,v])=>row[k]===v);}
  run(){
   const t=this.table,cols=t==='tcg_user_cards'?['owner_id','idioma','catalogo_id']:['id'];
   if(sinV2&&t==='tcg_profiles'&&/avatar|visible/.test(this.columnas||''))return {data:null,error:{code:'42703',message:'column tcg_profiles.avatar does not exist'}};
   if(this.operation==='upsert'){
    for(const raw of Array.isArray(this.input)?this.input:[this.input]){
     const row=clone(raw),existing=this.rows().find(r=>keyOf(r,cols)===keyOf(row,cols));
     if(t==='tcg_user_cards'){ // Las reglas reales de PostgreSQL: solo filas propias y hasta 500 cartas.
      if(!user||row.owner_id!==user.id)return {data:null,error:{message:'new row violates row-level security policy',code:'42501'}};
      if(!existing&&db.userCards.filter(r=>r.owner_id===user.id).length>=500)return {data:null,error:{message:'Has alcanzado el límite de 500 cartas.',code:'23514'}};
      if(existing)Object.assign(existing,{cantidad:row.cantidad,tipo:row.tipo,categoria:row.categoria});else db.userCards.push(row);
     }else if(t==='tcg_profiles'){
      if(existing){if(!this.options.ignoreDuplicates)Object.assign(existing,row);}else db.profiles[row.id]={avatar:'a1',visible:true,oculto:false,...row};
     }else if(!existing||!this.options.ignoreDuplicates)db.cards[row.id]=row;
    }
   }
   if(this.operation==='update')for(const row of this.rows())if(this.match(row))Object.assign(row,this.input);
   if(this.operation==='delete'){
    if(t==='tcg_user_cards')db.userCards=db.userCards.filter(r=>!(this.match(r)&&r.owner_id===user?.id));
   }
   persist();
   const rows=this.rows().filter(r=>this.match(r)).slice(this.start,this.end+1).map(clone);
   return {data:this.singleRow?(rows[0]||null):rows,error:null};
  }
  then(resolve,reject){return Promise.resolve().then(()=>this.run()).then(resolve,reject);}
 }
 const visibleProfile=p=>p.visible&&(!p.oculto||isAdmin());
 const descubrir=()=>{
  const total=(window.CATALOGO_DATA||[]).length+Object.keys(db.cards).filter(id=>!(window.CATALOGO_DATA||[]).some(c=>c.id===id)).length;
  const units=(window.CATALOGO_DATA||[]).reduce((n,c)=>n+c.cantidad,0);
  const list=[];
  if(visibleProfile(db.profiles[owner]))list.push({id:owner,username:db.profiles[owner].username,avatar:db.profiles[owner].avatar,cartas:total,ejemplares:units,propietario:true,oculto:db.profiles[owner].oculto});
  for(const p of Object.values(db.profiles)){
   const rows=db.userCards.filter(r=>r.owner_id===p.id);
   if(p.id!==owner&&rows.length&&visibleProfile(p))list.push({id:p.id,username:p.username,avatar:p.avatar,cartas:rows.length,ejemplares:rows.reduce((n,r)=>n+r.cantidad,0),propietario:false,oculto:p.oculto});
  }
  return list;
 };
 const rpcs={
  tcg_is_admin:()=>isAdmin(),
  tcg_descubrir:()=>descubrir(),
  tcg_perfil_publico:({uid})=>{const p=db.profiles[uid];return p&&visibleProfile(p)?[{id:p.id,username:p.username,avatar:p.avatar,propietario:p.id===owner}]:[];},
  tcg_ocultar:({uid,ocultar})=>{if(!isAdmin())throw {message:'Solo el administrador puede ocultar perfiles.',code:'42501'};db.profiles[uid].oculto=ocultar;persist();return null;},
  tcg_borrar_mis_datos:()=>{db.userCards=db.userCards.filter(r=>r.owner_id!==user.id);delete db.profiles[user.id];persist();return null;}
 };
 const client={from:table=>new Query(table),rpc:async(name,args={})=>{
  if(sinV2&&name!=='tcg_is_admin')return {data:null,error:{code:'PGRST202',message:'Could not find the function public.'+name+' in the schema cache'}};
  try{return {data:rpcs[name](args),error:null};}catch(error){return {data:null,error};}
 },auth:{
  getUser:async()=>({data:{user},error:null}),
  getSession:async()=>({data:{session:user?{user}:null},error:null}),
  stopAutoRefresh:async()=>{},
  initialize:async()=>({error:null}),
  onAuthStateChange:fn=>{callback=fn;setTimeout(()=>fn('INITIAL_SESSION',{user}),0);return {data:{subscription:{unsubscribe(){}}}};},
  signInWithOAuth:async args=>{window.testOAuth=args;return {data:{},error:null};},
  signOut:async()=>{user=null;callback('SIGNED_OUT',null);return {error:null};}
 },storage:{from:bucket=>({
  upload:async(name,file)=>{db.uploads.push({name,size:file.size});persist();return {error:null};},
  getPublicUrl:name=>({data:{publicUrl:'https://jrdgqdczplvehzzyhgqx.supabase.co/storage/v1/object/public/'+bucket+'/'+name}}),
  remove:async names=>{db.removed.push(...names);persist();return {error:null};}
 })}};
 const mock={createClient:()=>client};
 Object.defineProperty(window,'supabase',{configurable:true,get:()=>mock,set:()=>{}});
 window.testDatabase=db;
})();
