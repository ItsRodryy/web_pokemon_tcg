(() => {
 const owner='11111111-1111-4111-8111-111111111111',viewer='22222222-2222-4222-8222-222222222222';
 const scenario=new URL(location.href).searchParams.get('scenario')||'owner';
 const stored=localStorage.getItem('tcg_prueba_remoto');
 const db=stored?JSON.parse(stored):{profiles:{[owner]:{id:owner,username:'rodrytela'}},cards:{},uploads:[],removed:[]};
 const persist=()=>localStorage.setItem('tcg_prueba_remoto',JSON.stringify(db));
 let user=scenario==='anonymous'?null:{id:scenario==='viewer'?viewer:owner,email:scenario==='viewer'?'viewer@example.com':'adrianrodry55@gmail.com',user_metadata:{full_name:'Nombre de Google'}};
 let callback=()=>{};
 class Query{
  constructor(table){this.table=table;this.operation='get';this.filters={};this.start=0;this.end=999;}
  select(){return this;}
  eq(k,v){this.filters[k]=v;return this;}
  order(){return this;}
  range(a,b){this.start=a;this.end=b;return this;}
  maybeSingle(){this.singleRow=true;return this;}
  single(){this.singleRow=true;return this;}
  upsert(data,options={}){this.operation='upsert';this.input=data;this.options=options;return this;}
  update(data){this.operation='update';this.input=data;return this;}
  then(resolve,reject){return Promise.resolve().then(()=>{
   const table=this.table==='tcg_profiles'?db.profiles:db.cards;
   if(this.operation==='upsert')for(const row of Array.isArray(this.input)?this.input:[this.input])if(!this.options.ignoreDuplicates||!table[row.id])table[row.id]=JSON.parse(JSON.stringify(row));
   if(this.operation==='update')for(const row of Object.values(table))if(Object.entries(this.filters).every(([k,v])=>row[k]===v))Object.assign(row,this.input);
   persist();
   const rows=Object.values(table).filter(row=>Object.entries(this.filters).every(([k,v])=>row[k]===v)).slice(this.start,this.end+1);
   return {data:this.singleRow?(rows[0]||null):rows,error:null};
  }).then(resolve,reject);}
 }
 const client={from:table=>new Query(table),rpc:async()=>({data:user?.id===owner,error:null}),auth:{
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
