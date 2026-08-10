const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),WebSocket=require('ws');
const PORT=process.env.PORT||3000;
const server=http.createServer((req,res)=>{
 let f=req.url.split('?')[0]; if(f==='/')f='/index.html';
 let p=path.join(__dirname,f); if(!fs.existsSync(p))return res.writeHead(404).end('Not found');
 let ext=path.extname(p),type=ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':'text/plain; charset=utf-8';
 res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(p));
});
const wss=new WebSocket.Server({server});const rooms=new Map();
const COLORS=['red','yellow','green','blue'],SPECIAL=['skip','reverse','draw2'];
function makeDeck(){let d=[],id=1,add=(color,value)=>d.push({id:id++,color,value});COLORS.forEach(c=>{add(c,'0');for(let n=1;n<=9;n++){add(c,''+n);add(c,''+n)}for(const s of SPECIAL){add(c,s);add(c,s)}});for(let i=0;i<4;i++){add('wild','wild');add('wild','draw4')}return d}
function shuffle(a){for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}
function send(p,o){if(p.ws.readyState===WebSocket.OPEN)p.ws.send(JSON.stringify(o))}
function lobby(r){return {type:'room',room:r.code,host:r.players[0]?.id,players:r.players.map(p=>({name:p.name}))}}
function broadcastLobby(r){r.players.forEach(p=>send(p,lobby(r)))}
function publicState(r,me){return {room:r.code,me:me.id,turn:r.turn,color:r.color,discard:r.discard,awaitColor:r.awaitColor,players:r.players.map(p=>({id:p.id,name:p.name,hand:p.hand}))}}
function push(r){r.players.forEach(p=>send(p,{type:'state',state:publicState(r,p)}))}
function code(){let c;do c=Math.random().toString(36).slice(2,6).toUpperCase();while(rooms.has(c));return c}
function refill(r){if(!r.deck.length&&r.used.length){r.deck=r.used;r.used=[];shuffle(r.deck)}}
function draw(r,p,n=1){for(let i=0;i<n;i++){refill(r);if(r.deck.length)p.hand.push(r.deck.pop())}}
function next(r){r.turn=(r.turn+r.dir+r.players.length)%r.players.length}
function can(c,r){return c.color==='wild'||c.color===r.color||c.color===r.discard.color||c.value===r.discard.value}
function effects(r,c){
 if(c.value==='reverse')r.dir*=-1;
 if(c.value==='skip')next(r);
 if(c.value==='draw2'){let p=r.players[(r.turn+r.dir+r.players.length)%r.players.length];draw(r,p,2);next(r)}
 if(c.value==='draw4'){let p=r.players[(r.turn+r.dir+r.players.length)%r.players.length];draw(r,p,4);next(r)}
}
function play(r,p,id){
 if(!r.started||r.players[r.turn]!==p||r.awaitColor)return;
 let i=p.hand.findIndex(c=>c.id==id);if(i<0)return;
 let c=p.hand[i];if(!can(c,r))return send(p,{type:'error',message:'هذه الورقة غير صالحة الآن'});
 p.hand.splice(i,1);r.used.push(r.discard);r.discard=c;r.color=c.color==='wild'?null:c.color;r.awaitColor=c.color==='wild';
 if(!p.hand.length){broadcast(r,{type:'error',message:'🏆 '+p.name+' فاز!'});r.started=false;push(r);return}
 if(!r.awaitColor){effects(r,c);next(r)}
 push(r)
}
function broadcast(r,o){r.players.forEach(p=>send(p,o))}
wss.on('connection',ws=>{
 let player=null,room=null;
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}
  if(m.type==='create'){
   if(player)return;let codev=code();room={code:codev,players:[],deck:[],used:[],discard:null,turn:0,dir:1,color:null,awaitColor:false,started:false};
   rooms.set(codev,room);player={id:crypto.randomUUID(),name:String(m.name||'لاعب').slice(0,18),hand:[],ws};room.players.push(player);send(player,lobby(room));return
  }
  if(m.type==='join'){
   room=rooms.get(String(m.room||'').toUpperCase());if(!room)return ws.send(JSON.stringify({type:'error',message:'الغرفة غير موجودة'}));
   if(room.started||room.players.length>=4)return ws.send(JSON.stringify({type:'error',message:'الغرفة ممتلئة أو بدأت'}));
   player={id:crypto.randomUUID(),name:String(m.name||'لاعب').slice(0,18),hand:[],ws};room.players.push(player);broadcastLobby(room);return
  }
  if(!room||!player)return;
  if(m.type==='start'){
   if(room.players[0]!==player)return send(player,{type:'error',message:'فقط المضيف يستطيع البدء'});
   room.deck=makeDeck();shuffle(room.deck);room.used=[];room.players.forEach(p=>p.hand=[]);for(let i=0;i<7;i++)room.players.forEach(p=>draw(room,p));
   do room.discard=room.deck.pop();while(room.discard.color==='wild');room.color=room.discard.color;room.turn=0;room.dir=1;room.awaitColor=false;room.started=true;
   room.players.forEach(p=>send(p,{type:'started',state:publicState(room,p)}));return
  }
  if(m.type==='play')return play(room,player,m.id);
  if(m.type==='draw'){if(room.players[room.turn]!==player||room.awaitColor)return;draw(room,player);push(room);return}
  if(m.type==='color'){if(room.players[room.turn]!==player||!room.awaitColor||!COLORS.includes(m.color))return;room.color=m.color;room.awaitColor=false;effects(room,room.discard);next(room);push(room);return}
  if(m.type==='uno'){if(room.started&&player.hand.length===1)broadcast(room,{type:'error',message:'🔥 '+player.name+' قال UNO!'})}
  if(m.type==='chat'){let text=String(m.text||'').trim().slice(0,180);if(!text)return;broadcast(room,{type:'chat',name:player.name,text})}
 });
 ws.on('close',()=>{if(!room||!player)return;room.players=room.players.filter(p=>p!==player);if(!room.players.length){rooms.delete(room.code);return}if(room.turn>=room.players.length)room.turn=0;broadcastLobby(room);if(room.started)push(room)})
});
server.listen(PORT,'0.0.0.0',()=>console.log('UNO Online: http://localhost:'+PORT));
