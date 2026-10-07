const $=s=>document.querySelector(s),app=$('#app');
let walks=[];try{walks=JSON.parse(localStorage.getItem('walks2')||'[]')}catch(e){}
const save=()=>{try{localStorage.setItem('walks2',JSON.stringify(walks))}catch(e){alert('Sem espaço para salvar.')}};
try{const t=localStorage.getItem('tema');if(t)document.documentElement.dataset.t=t}catch(e){}
const calc=d=>({d,kcal:Math.round(d*0.066),min:Math.max(1,Math.round(d/83))}); // ~5 km/h, ~70 kg
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const drawer=o=>{$('#drawer').classList.toggle('o',o);$('#veil').classList.toggle('o',o)};
$('#veil').onclick=()=>drawer(false);

// Splash (RF001)
function splash(){const s=document.createElement('div');s.id='splash';s.innerHTML='<div class="l">🚶</div><b style="font-size:22px">Caminhadas</b>';document.body.append(s);setTimeout(()=>s.remove(),2500)}
$('#mS').onclick=()=>{drawer(false);splash()};
$('#mT').onclick=()=>{const r=document.documentElement,dark=getComputedStyle(r).getPropertyValue('--bg').trim()==='#141a16';r.dataset.t=dark?'light':'dark';try{localStorage.setItem('tema',r.dataset.t)}catch(e){}drawer(false)};
$('#mX').onclick=()=>{drawer(false);window.close();app.innerHTML='<div class="empty" style="margin:auto">👋 Até a próxima caminhada!<br><br><button onclick="home()">Voltar</button></div>'};

// Mapa real (Leaflet + OpenStreetMap)
let mapa=null;
function criaMapa(id,centro,zoom){
 if(mapa){mapa.remove();mapa=null}
 mapa=L.map(id).setView(centro,zoom);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(mapa);
 return mapa;
}

// Home (RF002)
function home(){
 if(mapa){mapa.remove();mapa=null}
 app.innerHTML=`<header><button class="ic" id="bm">☰</button>Caminhadas</header><div class="list">${
 walks.length?walks.map((w,i)=>`<div class="card" data-i="${i}"><div class="th">${w.foto?`<img src="${w.foto}">`:'🖼️'}</div><b>${esc(w.titulo)}</b></div>`).join(''):'<div class="empty">Nenhuma caminhada ainda.<br>Toque em + para começar.</div>'}</div><button class="fab" id="add">+</button>`;
 $('#bm').onclick=()=>drawer(true);$('#add').onclick=nova;
 document.querySelectorAll('.card').forEach(c=>c.onclick=()=>detalhe(+c.dataset.i));
}

// Nova caminhada (RF003)
function nova(){
 app.innerHTML=`<header><button class="ic" id="bk">←</button>Nova caminhada</header><div class="info" id="inf">Obtendo sua localização…</div><div id="map"></div>`;
 $('#bk').onclick=home;
 const padrao=[-23.5505,-46.6333];
 const iniciar=(origem,msg)=>{
  const m=criaMapa('map',origem,16);
  L.marker(origem).addTo(m).bindPopup('Você está aqui');
  $('#inf').textContent=msg||'Clique no destino da sua caminhada';
  let linha=null,pino=null;
  m.on('click',async e=>{
   const dest=[e.latlng.lat,e.latlng.lng];
   if(pino)m.removeLayer(pino);if(linha)m.removeLayer(linha);
   pino=L.marker(dest).addTo(m);
   $('#inf').textContent='Traçando trajeto…';
   let rota,dm,aviso='';
   try{
    const u=`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${origem[1]},${origem[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
    const j=await (await fetch(u)).json(),r=j.routes[0];
    rota=r.geometry.coordinates.map(c=>[c[1],c[0]]);dm=Math.round(r.distance);
   }catch(err){rota=[origem,dest];dm=Math.round(m.distance(origem,dest));aviso=' (linha reta: rota indisponível)'}
   linha=L.polyline(rota,{color:'#111',weight:5}).addTo(m);
   m.fitBounds(linha.getBounds(),{padding:[50,50]});
   const c=calc(dm);
   $('#inf').innerHTML=`<span>Vai percorrer <b>${c.d} m</b>, queimando cerca de <b>${c.kcal} calorias</b> em ~${c.min} min.${aviso}</span><button class="pri" id="sv">Salvar</button>`;
   $('#sv').onclick=()=>modal({origem,dest,rota},c);
  });
 };
 if(navigator.geolocation)navigator.geolocation.getCurrentPosition(
  p=>iniciar([p.coords.latitude,p.coords.longitude]),
  ()=>iniciar(padrao,'Sem localização: usando São Paulo. Clique no destino'),
  {timeout:8000,enableHighAccuracy:true});
 else iniciar(padrao,'Sem geolocalização. Clique no destino');
}

// Modal Salvar (RF003.2)
function modal(dados,c){
 const o=document.createElement('div');o.className='modal';
 o.innerHTML=`<div class="box"><div>Caminhou uma distância de ${c.d} m queimando cerca de ${c.kcal} calorias</div><input type="text" id="tt" placeholder="Título da caminhada" maxlength="40"><div style="display:flex;gap:8px;justify-content:center"><button id="no">Cancelar</button><button class="pri" id="ok">Salvar</button></div></div>`;
 document.body.append(o);$('#tt').focus();$('#no').onclick=()=>o.remove();
 $('#ok').onclick=()=>{const t=$('#tt').value.trim();if(!t){$('#tt').style.borderColor='#c0392b';return}
  walks.unshift({titulo:t,...dados,...c,foto:null,data:Date.now()});save();o.remove();home()};
}

// Detalhes (RF004)
function detalhe(i){
 const w=walks[i];
 app.innerHTML=`<header><button class="ic" id="bk">←</button>${esc(w.titulo)}</header>
 <div class="photo" id="ph">${w.foto?`<img src="${w.foto}">`:'<button class="ic" id="cam" style="font-size:56px">📷</button>'}</div>
 <div class="info"><span>Caminhou <b>${w.d} m</b>, queimando cerca de <b>${w.kcal} calorias</b> em ~${w.min} min.</span></div><div id="map"></div>
 <input type="file" id="fi" accept="image/*" capture="environment" hidden>`;
 $('#bk').onclick=home;
 const m=criaMapa('map',w.origem,15);
 L.marker(w.origem).addTo(m);L.marker(w.dest).addTo(m);
 const linha=L.polyline(w.rota,{color:'#111',weight:5}).addTo(m);
 m.fitBounds(linha.getBounds(),{padding:[40,40]});
 const cam=$('#cam');if(cam)cam.onclick=()=>$('#fi').click();
 $('#fi').onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();
  im.onload=()=>{const s=Math.min(1,640/im.width),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);
   w.foto=c.toDataURL('image/jpeg',.7);save();detalhe(i)};im.src=URL.createObjectURL(f)};
}
home();splash();