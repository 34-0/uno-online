<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UNO Online</title>

<style>
*{box-sizing:border-box}

body{
margin:0;
font-family:Tahoma,Arial,sans-serif;
color:#fff;
min-height:100vh;
background:radial-gradient(circle at 50% 15%,#24116b 0,#09041d 38%,#02030b 100%);
overflow-x:hidden
}

button,input{font:inherit}

.screen{
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
padding:24px
}

.panel{
width:min(620px,94vw);
background:#050611ed;
border:2px solid #7c35ff;
border-radius:28px;
padding:30px;
box-shadow:0 0 25px #7b25ff66,0 0 90px #ff20e633
}

.logo{
text-align:center;
font-size:78px;
font-weight:1000;
font-style:italic;
letter-spacing:-5px;
color:#fff;
text-shadow:5px 5px 0 #ed162c,-3px -3px 0 #ffd400,0 0 30px #ff3155
}

.sub{
text-align:center;
color:#d6d2ff;
font-size:16px
}

.field{
width:100%;
padding:15px;
border-radius:15px;
border:1px solid #6d70a4;
background:#08091b;
color:#fff;
margin:8px 0 11px;
outline:none
}

.field:focus{
border-color:#ff28c8;
box-shadow:0 0 16px #ff28c855
}

.row{
display:flex;
gap:11px
}

.btn{
border:1px solid #ffffff25;
border-radius:15px;
padding:14px 18px;
font-weight:900;
cursor:pointer;
box-shadow:0 7px 0 #0007;
transition:.15s
}

.btn:hover{
transform:translateY(-2px);
filter:brightness(1.12)
}

.btn:active{
transform:translateY(2px);
box-shadow:0 3px 0 #0007
}

.btn:disabled{
opacity:.45;
cursor:not-allowed
}

.primary{
background:linear-gradient(135deg,#073eff,#8c18ff,#ff16c8);
color:#fff
}

.secondary{
background:linear-gradient(135deg,#171b45,#37206e);
color:#fff
}

.green{
background:linear-gradient(135deg,#00a968,#00e19a);
color:#06130f
}

.hidden{
display:none!important
}

.note{
text-align:center;
color:#b8b4de;
font-size:13px
}

.modal{
position:fixed;
inset:0;
background:#000b;
display:flex;
align-items:center;
justify-content:center;
z-index:50;
backdrop-filter:blur(8px)
}

.modalbox{
background:#070818f5;
border:2px solid #b02cff;
border-radius:22px;
padding:24px;
width:min(460px,92vw);
text-align:center;
box-shadow:0 0 40px #a323ff66
}

.colors{
display:grid;
grid-template-columns:1fr 1fr;
gap:10px
}

.cb{
padding:14px;
border:0;
border-radius:12px;
font-weight:900;
cursor:pointer
}

/* GAME */

#game{
min-height:100vh;
display:grid;
grid-template-rows:auto 1fr auto;
gap:12px;
padding:14px;
max-width:1550px;
margin:auto
}

.top{
display:flex;
justify-content:space-between;
align-items:center;
gap:10px;
background:#050611e8;
border:1px solid #6d36d9;
border-radius:18px;
padding:10px 14px
}

.brand{
font-size:29px;
font-weight:1000;
font-style:italic;
color:#fff;
text-shadow:2px 2px #ff204c,0 0 18px #ffd21f
}

.pill{
background:#0d0f2b;
border:1px solid #5e5ba0;
border-radius:99px;
padding:8px 12px;
font-size:13px
}

.table{
position:relative;
min-height:590px;
background:radial-gradient(ellipse at center,#123f37,#071d20 48%,#030713 100%);
border:7px solid #55259a;
border-radius:38%/24%;
display:flex;
align-items:center;
justify-content:center;
box-shadow:0 0 35px #7a28ff44,inset 0 0 60px #000
}

.center{
display:flex;
gap:22px;
z-index:2
}

.deck,.card{
width:86px;
height:122px;
border-radius:14px;
border:3px solid #fff;
box-shadow:0 9px 24px #000b,0 0 15px #ffffff22
}

.deck{
background:repeating-linear-gradient(45deg,#10164e 0 7px,#43208b 7px 14px);
display:flex;
align-items:center;
justify-content:center;
font-size:28px;
font-weight:1000;
cursor:pointer
}

.card{
position:relative;
display:flex;
align-items:center;
justify-content:center;
color:#fff;
font-size:35px;
font-weight:1000
}

.red{background:#ed2538}
.yellow{background:#f3c900;color:#111}
.greenC{background:#11a968}
.blue{background:#2479e7}

.wild{
background:linear-gradient(
135deg,
#ed2538 0 25%,
#f3c900 25% 50%,
#11a968 50% 75%,
#2479e7 75%
)
}

.oval{
position:absolute;
width:65%;
height:72%;
border:3px solid #ffffffaa;
border-radius:50%;
transform:rotate(-30deg)
}

.v{
z-index:2
}

.player{
position:absolute;
background:#070914e8;
border:1px solid #6b65a7;
border-radius:16px;
padding:8px 13px;
text-align:center;
min-width:130px;
box-shadow:0 0 20px #0008
}

.p0{
bottom:12px;
left:50%;
transform:translateX(-50%)
}

.p1{
top:13px;
left:50%;
transform:translateX(-50%)
}

.p2{
left:12px;
top:50%;
transform:translateY(-50%)
}

.p3{
right:12px;
top:50%;
transform:translateY(-50%)
}

.active{
border-color:#ffdb35;
box-shadow:0 0 28px #ffdb3566
}

.handbox{
background:#050611ee;
border:1px solid #6534bd;
border-radius:18px;
padding:10px
}

.hand{
display:flex;
justify-content:center;
align-items:flex-end;
min-height:125px;
overflow-x:auto;
direction:ltr
}

.mycard{
margin:0 -7px;
cursor:pointer;
transition:.16s
}

.mycard:hover{
transform:translateY(-15px) scale(1.03);
z-index:4
}

.actions{
text-align:center;
margin-top:7px
}

.turn{
position:absolute;
bottom:55px;
background:#050611dd;
border:1px solid #ff25d5;
color:#fff;
border-radius:99px;
padding:8px 14px;
box-shadow:0 0 18px #ff25d544
}

.toast{
position:fixed;
left:50%;
bottom:25px;
transform:translateX(-50%);
background:#050611f5;
border:1px solid #ff25d5;
padding:11px 18px;
border-radius:99px;
z-index:70;
opacity:0;
pointer-events:none;
box-shadow:0 0 22px #ff25d555;
transition:.2s
}

.toast.show{
opacity:1
}

.statusOnline{
color:#00e19a!important;
font-weight:bold
}

.statusOffline{
color:#ff4260!important;
font-weight:bold
}

.statusConnecting{
color:#ffd21f!important;
font-weight:bold
}

.chatToggle{
position:fixed;
right:18px;
bottom:175px;
z-index:60;
width:58px;
height:58px;
border:2px solid #ff2ac8;
border-radius:50%;
background:linear-gradient(135deg,#152dff,#ff18c8);
color:#fff;
font-size:25px;
cursor:pointer;
box-shadow:0 0 24px #ff20c866,0 8px 20px #0008
}

.chatPanel{
position:fixed;
right:18px;
bottom:245px;
width:min(350px,calc(100vw - 36px));
height:430px;
background:#050611f7;
border:2px solid #7d2dff;
border-radius:20px;
z-index:59;
display:flex;
flex-direction:column;
box-shadow:0 0 35px #7b22ff66;
overflow:hidden
}

.chatHead{
padding:12px 14px;
background:linear-gradient(90deg,#101a52,#46105d);
display:flex;
align-items:center;
justify-content:space-between;
font-weight:1000
}

.chatClose{
background:none;
border:0;
color:#fff;
font-size:20px;
cursor:pointer
}

.chatMsgs{
flex:1;
overflow:auto;
padding:12px;
display:flex;
flex-direction:column;
gap:8px
}

.chatMsg{
max-width:85%;
background:#10132e;
border:1px solid #3f4480;
border-radius:13px;
padding:8px 10px;
align-self:flex-start;
word-break:break-word
}

.chatMsg.mine{
align-self:flex-end;
border-color:#ff2ac8;
background:#28103a
}

.chatName{
font-size:11px;
color:#ff58d8;
margin-bottom:3px
}

.chatComposer{
padding:9px;
border-top:1px solid #383a67
}

.emojiRow{
display:flex;
gap:4px;
margin-bottom:7px;
flex-wrap:wrap
}

.emojiBtn{
background:#0d1030;
border:1px solid #4a4e85;
border-radius:8px;
padding:4px 7px;
cursor:pointer;
font-size:17px
}

.chatForm{
display:flex;
gap:6px
}

.chatInput{
flex:1;
background:#090b20;
border:1px solid #555b92;
color:#fff;
border-radius:10px;
padding:10px;
outline:none
}

.chatSend{
background:linear-gradient(135deg,#264eff,#d51cff);
border:0;
color:#fff;
border-radius:10px;
padding:0 13px;
font-weight:900;
cursor:pointer
}

.chatBadge{
position:absolute;
right:-2px;
top:-2px;
background:#ff245f;
color:#fff;
border-radius:50%;
min-width:19px;
height:19px;
font-size:11px;
display:flex;
align-items:center;
justify-content:center
}

@media(max-width:650px){

.logo{
font-size:62px
}

.table{
min-height:500px
}

.card,.deck{
width:70px;
height:100px
}

.top{
flex-direction:column
}

.p2{
left:5px
}

.p3{
right:5px
}

.player{
min-width:95px;
font-size:12px
}

}
</style>
</head>

<body>

<!-- LOGIN -->

<div id="login" class="screen">

<div class="panel">

<div class="logo">UNO</div>

<p class="sub">
العب أونلاين مع أصدقائك أو العب ضد البوتات
</p>

<input
id="name"
class="field"
maxlength="18"
placeholder="اسمك"
value="راشد"
>

<div class="row">

<button
id="createBtn"
class="btn primary"
style="flex:1"
onclick="createRoom()"
disabled
>
إنشاء غرفة
</button>

<button
id="joinBtn"
class="btn secondary"
style="flex:1"
onclick="joinRoom()"
disabled
>
انضمام
</button>

</div>

<input
id="room"
class="field"
maxlength="8"
placeholder="رمز الغرفة"
style="text-transform:uppercase"
>

<button
class="btn green"
style="width:100%"
onclick="startBot()"
>
🤖 اللعب مع بوت
</button>

<button
class="btn secondary"
style="width:100%;margin-top:10px"
onclick="openDev()"
>
👥 المطورين
</button>

<p id="conn" class="note statusConnecting">
الاتصال: جاري الاتصال...
</p>

</div>
</div>


<!-- LOBBY -->

<div id="lobby" class="screen hidden">

<div class="panel">

<div class="logo" style="font-size:54px">
UNO
</div>

<h2 style="text-align:center">
غرفة اللعب
</h2>

<div
id="roomCode"
style="text-align:center;font-size:42px;font-weight:1000"
>
</div>

<p class="sub">
أرسل الرمز لأصدقائك
</p>

<div id="players"></div>

<button
id="startBtn"
class="btn primary"
style="width:100%;margin-top:15px"
onclick="startOnline()"
>
ابدأ اللعبة
</button>

<button
class="btn secondary"
style="width:100%;margin-top:10px"
onclick="location.reload()"
>
خروج
</button>

</div>
</div>


<!-- GAME -->

<div id="game" class="hidden">

<div class="top">

<div class="brand">
UNO ONLINE
</div>

<div>

<span class="pill">
👤 <b id="me"></b>
</span>

<span class="pill">
غرفة: <b id="codeTop"></b>
</span>

<button
class="btn secondary"
onclick="location.reload()"
>
خروج
</button>

</div>

</div>


<main class="table">

<div id="board"></div>

<div class="center">

<div
class="deck"
onclick="drawCard()"
title="سحب ورقة"
>
UNO
</div>

<div id="discard"></div>

</div>

<div id="turn" class="turn"></div>

</main>


<section class="handbox">

<div id="hand" class="hand"></div>

<div class="actions">

<button
class="btn secondary"
onclick="drawCard()"
>
سحب ورقة
</button>

<button
class="btn green"
onclick="sayUno()"
>
UNO!
</button>

</div>

<div id="status" class="note"></div>

</section>

</div>


<!-- CHAT -->

<button
id="chatToggle"
class="chatToggle hidden"
onclick="toggleChat()"
aria-label="الدردشة"
>
💬
<span id="chatBadge" class="chatBadge hidden">0</span>
</button>

<div id="chatPanel" class="chatPanel hidden">

<div class="chatHead">

<span>💬 دردشة الغرفة</span>

<button
class="chatClose"
onclick="toggleChat()"
>
×
</button>

</div>

<div id="chatMsgs" class="chatMsgs"></div>

<div class="chatComposer">

<div class="emojiRow">

<button class="emojiBtn" onclick="addEmoji('😀')">😀</button>
<button class="emojiBtn" onclick="addEmoji('😂')">😂</button>
<button class="emojiBtn" onclick="addEmoji('😍')">😍</button>
<button class="emojiBtn" onclick="addEmoji('🔥')">🔥</button>
<button class="emojiBtn" onclick="addEmoji('❤️')">❤️</button>
<button class="emojiBtn" onclick="addEmoji('👍')">👍</button>
<button class="emojiBtn" onclick="addEmoji('👎')">👎</button>
<button class="emojiBtn" onclick="addEmoji('🎉')">🎉</button>
<button class="emojiBtn" onclick="addEmoji('😎')">😎</button>
<button class="emojiBtn" onclick="addEmoji('🤖')">🤖</button>
<button class="emojiBtn" onclick="addEmoji('😱')">😱</button>
<button class="emojiBtn" onclick="addEmoji('👏')">👏</button>
<button class="emojiBtn" onclick="addEmoji('💯')">💯</button>
<button class="emojiBtn" onclick="addEmoji('🤣')">🤣</button>
<button class="emojiBtn" onclick="addEmoji('🙌')">🙌</button>

</div>

<div class="chatForm">

<input
id="chatInput"
class="chatInput"
maxlength="180"
placeholder="اكتب رسالة..."
onkeydown="if(event.key==='Enter')sendChat()"
>

<button
class="chatSend"
onclick="sendChat()"
>
إرسال
</button>

</div>

</div>
</div>


<!-- COLOR -->

<div id="colorModal" class="modal hidden">

<div class="modalbox">

<h2>
اختر اللون
</h2>

<div class="colors">

<button
class="cb"
style="background:#e92b35;color:#fff"
onclick="pickColor('red')"
>
أحمر
</button>

<button
class="cb"
style="background:#f2c400"
onclick="pickColor('yellow')"
>
أصفر
</button>

<button
class="cb"
style="background:#16a968;color:#fff"
onclick="pickColor('green')"
>
أخضر
</button>

<button
class="cb"
style="background:#287be0;color:#fff"
onclick="pickColor('blue')"
>
أزرق
</button>

</div>
</div>
</div>


<!-- DEVELOPERS -->

<div id="devModal" class="modal hidden">

<div class="modalbox">

<h2 style="color:#ff29c8;font-size:30px">
المطورين
</h2>

<hr>

<div style="font-size:21px;line-height:2.2">

<b>رشود القحطاني</b>

<br>

<span style="color:#58d6ff">◆</span>

<br>

<b>علي الحربي</b>

</div>

<hr>

<h3 style="color:#ff29c8">
حساب المطور
</h3>

<a
href="https://www.instagram.com/8_q/"
target="_blank"
rel="noopener noreferrer"
style="color:#ff2aa9;font-weight:1000;font-size:23px;text-decoration:none"
>
◎ dpyt 8_q
</a>

<button
class="btn secondary"
style="width:100%;margin-top:18px"
onclick="closeDev()"
>
إغلاق
</button>

</div>
</div>


<div id="toast" class="toast"></div>


<script>

let ws = null;
let online = false;
let mode = "online";
let me = "";
let room = "";
let bot = null;

const $ = id => document.getElementById(id);

const colors = ["red","yellow","green","blue"];


/* =========================
   TOAST
========================= */

function toast(text){

const box = $("toast");

box.textContent = text;

box.classList.add("show");

clearTimeout(window.toastTimer);

window.toastTimer = setTimeout(() => {
box.classList.remove("show");
},2500);

}


/* =========================
   DEVELOPER
========================= */

function openDev(){
$("devModal").classList.remove("hidden");
}

function closeDev(){
$("devModal").classList.add("hidden");
}


/* =========================
   WEBSOCKET CONNECTION
========================= */

function getSocketURL(){

const protocol =
location.protocol === "https:"
? "wss:"
: "ws:";

return protocol + "//" + location.host;

}


function connect(){

const conn = $("conn");

conn.textContent = "الاتصال: جاري الاتصال...";
conn.className = "note statusConnecting";

try{

ws = new WebSocket(getSocketURL());

}catch(error){

console.error(error);

conn.textContent = "الاتصال: فشل إنشاء الاتصال";
conn.className = "note statusOffline";

return;

}


ws.onopen = function(){

online = true;

conn.textContent = "الاتصال: متصل ✓";
conn.className = "note statusOnline";

$("createBtn").disabled = false;
$("joinBtn").disabled = false;

};


ws.onmessage = function(event){

let message;

try{

message = JSON.parse(event.data);

}catch(error){

console.error("WebSocket JSON error:",error);

return;

}


if(message.type === "connected"){

online = true;

conn.textContent = "الاتصال: متصل ✓";
conn.className = "note statusOnline";

$("createBtn").disabled = false;
$("joinBtn").disabled = false;

return;

}


if(message.type === "error"){

toast(message.message || "حدث خطأ");

return;

}


if(message.type === "room"){

showLobby(message);

return;

}


if(message.type === "started"){

showGame();

renderOnline(message.state);

return;

}


if(message.type === "state"){

renderOnline(message.state);

return;

}


if(message.type === "chat"){

addChatMessage(message);

return;

}

};


ws.onerror = function(error){

console.error("WebSocket error:",error);

online = false;

conn.textContent = "الاتصال: خطأ في الاتصال";
conn.className = "note statusOffline";

};


ws.onclose = function(){

online = false;

$("createBtn").disabled = true;
$("joinBtn").disabled = true;

conn.textContent = "الاتصال: انقطع";
conn.className = "note statusOffline";

};

}


/* =========================
   SEND
========================= */

function send(type,data={}){

if(!ws || ws.readyState !== WebSocket.OPEN){

toast("الاتصال غير جاهز");

return false;

}

ws.send(JSON.stringify({
type,
...data
}));

return true;

}


/* =========================
   CREATE / JOIN
========================= */

function createRoom(){

if(!online){

toast("انتظر حتى يظهر: متصل ✓");

return;

}

mode = "online";

me =
$("name").value.trim() ||
"لاعب";

send("create",{
name:me
});

}


function joinRoom(){

if(!online){

toast("انتظر حتى يظهر: متصل ✓");

return;

}

mode = "online";

me =
$("name").value.trim() ||
"لاعب";

room =
$("room").value.trim().toUpperCase();

if(!room){

toast("اكتب رمز الغرفة");

return;

}

send("join",{
name:me,
room
});

}


/* =========================
   LOBBY
========================= */

function showLobby(data){

room = data.room;

$("roomCode").textContent = room;

$("login").classList.add("hidden");

$("lobby").classList.remove("hidden");

$("startBtn").style.display =
data.host
? "block"
: "none";


$("players").innerHTML =
data.players.map((player,index)=>{

return `
<div
class="pill"
style="display:block;margin:7px 0"
>
🎮 ${escapeHTML(player.name)}
${index === 0 ? " — المضيف" : ""}
</div>
`;

}).join("");

}


function startOnline(){

if(!online){

toast("الاتصال غير جاهز");

return;

}

send("start");

}


/* =========================
   GAME
========================= */

function showGame(){

$("login").classList.add("hidden");

$("lobby").classList.add("hidden");

$("game").classList.remove("hidden");

if(mode === "online"){

$("chatToggle").classList.remove("hidden");

}else{

$("chatToggle").classList.add("hidden");

}

}


/* =========================
   CARDS
========================= */

function label(value){

return {

skip:"⊘",

reverse:"↔",

draw2:"+2",

draw4:"+4",

wild:"★"

}[value] || value;

}


function cardHTML(cardData,clickable=false){

const cls =
cardData.color === "wild"
? "wild"
: cardData.color === "green"
? "greenC"
: cardData.color;


const click =
clickable
? `onclick="playCard(${cardData.id})"`
: "";


return `
<div
class="card ${cls} ${clickable ? "mycard" : ""}"
${click}
>
<span class="oval"></span>
<span class="v">${label(cardData.value)}</span>
</div>
`;

}


/* =========================
   ONLINE RENDER
========================= */

function renderOnline(state){

if(!state || !state.players) return;


const current =
state.players.find(player => player.id === state.me);


if(!current) return;


$("me").textContent =
current.name || me;


$("codeTop").textContent =
state.room || "";


if(state.discard){

$("discard").innerHTML =
cardHTML(state.discard);

}


$("hand").innerHTML =
current.hand.map(cardData =>
cardHTML(cardData,true)
).join("");


const currentPlayer =
state.players[state.turn];


if(currentPlayer){

$("turn").textContent =
currentPlayer.id === state.me
? "دورك الآن"
: "دور " + currentPlayer.name;

}


$("status").textContent =
"اللون الحالي: " +
(state.color || state.discard?.color || "");


const positions =
["p0","p1","p2","p3"];


$("board").innerHTML =
state.players.map((player,index)=>{

return `
<div
class="player ${positions[index] || "p0"} ${index === state.turn ? "active" : ""}"
>
🎮 <b>${escapeHTML(player.name)}</b>
<br>
<small>${player.hand.length} أوراق</small>
</div>
`;

}).join("");


if(
state.awaitColor &&
currentPlayer &&
currentPlayer.id === state.me
){

$("colorModal").classList.remove("hidden");

}else{

$("colorModal").classList.add("hidden");

}

}


/* =========================
   PLAY
========================= */

function playCard(id){

if(mode === "bot"){

botPlayHuman(id);

return;

}

send("play",{
id
});

}


function drawCard(){

if(mode === "bot"){

botDrawHuman();

return;

}

send("draw");

}


function sayUno(){

if(mode === "bot"){

if(
bot &&
bot.players[0].hand.length === 1
){

toast("🔥 UNO!");

}

return;

}

send("uno");

}


function pickColor(color){

$("colorModal").classList.add("hidden");

if(mode === "bot"){

botColor(color);

return;

}

send("color",{
color
});

}


/* =========================
   CHAT
========================= */

let chatOpen = false;
let chatUnread = 0;


function toggleChat(){

chatOpen = !chatOpen;

$("chatPanel").classList.toggle(
"hidden",
!chatOpen
);


if(chatOpen){

chatUnread = 0;

$("chatBadge").classList.add("hidden");

setTimeout(()=>{
$("chatInput").focus();
},50);

}

}


function addEmoji(emoji){

$("chatInput").value += emoji;

$("chatInput").focus();

}


function escapeHTML(value){

return String(value).replace(
/[&<>"']/g,
char => ({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#39;"
}[char])
);

}


function addChatMessage(message){

const box =
$("chatMsgs");

const mine =
message.name === me;


const div =
document.createElement("div");


div.className =
"chatMsg " +
(mine ? "mine" : "");


div.innerHTML = `
<div class="chatName">
${escapeHTML(message.name)}
</div>
<div>
${escapeHTML(message.text)}
</div>
`;


box.appendChild(div);

box.scrollTop =
box.scrollHeight;


if(!chatOpen && !mine){

chatUnread++;

$("chatBadge").textContent =
chatUnread;

$("chatBadge").classList.remove(
"hidden"
);

}

}


function sendChat(){

if(mode !== "online"){

toast("الدردشة متاحة في الأونلاين");

return;

}

const input =
$("chatInput");

const text =
input.value.trim();


if(!text) return;


send("chat",{
text
});


input.value = "";

}


/* =========================
   BOT GAME
========================= */

function makeBotDeck(){

const deck = [];

let id = 1;

function add(color,value){

deck.push({
id:id++,
color,
value
});

}


for(const color of colors){

add(color,"0");

for(let n=1;n<=9;n++){

add(color,String(n));
add(color,String(n));

}

for(const special of [
"skip",
"reverse",
"draw2"
]){

add(color,special);
add(color,special);

}

}


for(let i=0;i<4;i++){

add("wild","wild");
add("wild","draw4");

}


return deck;

}


function shuffle(deck){

for(
let i=deck.length-1;
i>0;
i--
){

const j =
Math.floor(
Math.random() * (i+1)
);

[
deck[i],
deck[j]
] =
[
deck[j],
deck[i]
];

}

}


function startBot(){

mode = "bot";


const deck =
makeBotDeck();


shuffle(deck);


bot = {

players:[
{
name:$("name").value.trim() || "راشد",
hand:[]
},
{
name:"بوت 1",
hand:[]
},
{
name:"بوت 2",
hand:[]
},
{
name:"بوت 3",
hand:[]
}
],

deck,
used:[],
discard:null,
color:null,
turn:0,
direction:1,
over:false

};


for(let i=0;i<7;i++){

bot.players.forEach(player=>{
player.hand.push(
bot.deck.pop()
);
});

}


do{

bot.discard =
bot.deck.pop();

}while(
bot.discard.color === "wild"
);


bot.color =
bot.discard.color;


showGame();

$("codeTop").textContent =
"BOT";

renderBot();

toast("🤖 بدأت مباراة ضد 3 بوتات");

}


function botRefill(){

if(
!bot.deck.length &&
bot.used.length
){

bot.deck =
bot.used;

bot.used = [];

shuffle(bot.deck);

}

}


function botDraw(player,amount=1){

for(let i=0;i<amount;i++){

botRefill();

if(bot.deck.length){

player.hand.push(
bot.deck.pop()
);

}

}

}


function botValid(card){

return (
card.color === "wild" ||
card.color === bot.color ||
card.color === bot.discard.color ||
card.value === bot.discard.value
);

}


function botNext(){

bot.turn =
(
bot.turn +
bot.direction +
4
) % 4;

}


function botEffects(card){

if(card.value === "reverse"){

bot.direction *= -1;

}


if(card.value === "skip"){

botNext();

}


if(card.value === "draw2"){

const index =
(
bot.turn +
bot.direction +
4
) % 4;

botDraw(
bot.players[index],
2
);

botNext();

}


if(card.value === "draw4"){

const index =
(
bot.turn +
bot.direction +
4
) % 4;

botDraw(
bot.players[index],
4
);

botNext();

}

}


function botPlay(player,card){

const index =
player.hand.indexOf(card);


if(index < 0) return false;


if(!botValid(card)){

return false;

}


player.hand.splice(index,1);


if(bot.discard){

bot.used.push(
bot.discard
);

}


bot.discard = card;


if(card.color === "wild"){

bot.color = null;

}else{

bot.color = card.color;

}


if(player.hand.length === 0){

bot.over = true;

renderBot();

toast(
"🏆 " + player.name + " فاز!"
);

return true;

}


if(card.color !== "wild"){

botEffects(card);

botNext();

}


renderBot();

return true;

}


function botPlayHuman(id){

if(
bot.over ||
bot.turn !== 0
) return;


const player =
bot.players[0];


const card =
player.hand.find(
cardData =>
cardData.id === id
);


if(!card) return;


if(!botValid(card)){

toast("هذه الورقة غير صالحة الآن");

return;

}


botPlay(
player,
card
);


if(
!bot.over &&
bot.turn !== 0
){

botTurn();

}

}


function botDrawHuman(){

if(
bot.over ||
bot.turn !== 0
) return;


botDraw(
bot.players[0]
);

botNext();

renderBot();

botTurn();

}


function botColor(color){

if(
bot.over ||
bot.turn !== 0
) return;


bot.color = color;

botEffects(
bot.discard
);

botNext();

renderBot();

botTurn();

}


function botTurn(){

if(
bot.over ||
bot.turn === 0
) return;


setTimeout(()=>{

if(bot.over) return;


const player =
bot.players[bot.turn];


const validCards =
player.hand.filter(
botValid
);


if(!validCards.length){

botDraw(player);

botNext();

renderBot();

if(
!bot.over &&
bot.turn !== 0
){

botTurn();

}

return;

}


const card =
validCards[
Math.floor(
Math.random() *
validCards.length
)
];


botPlay(
player,
card
);


if(
card.color === "wild" &&
!bot.over
){

bot.color =
colors[
Math.floor(
Math.random() * 4
)
];


botEffects(card);

botNext();

renderBot();

}


if(
!bot.over &&
bot.turn !== 0
){

botTurn();

}

},650);

}


/* =========================
   BOT RENDER
========================= */

function renderBot(){

const player =
bot.players[0];


$("me").textContent =
player.name;


$("discard").innerHTML =
cardHTML(bot.discard);


$("hand").innerHTML =
player.hand.map(
cardData =>
cardHTML(cardData,true)
).join("");


if(bot.over){

$("turn").textContent =
"انتهت المباراة";

}else if(bot.turn === 0){

$("turn").textContent =
"دورك الآن";

}else{

$("turn").textContent =
"دور " +
bot.players[bot.turn].name;

}


$("status").textContent =
"اللون الحالي: " +
bot.color +
" — 🤖 ضد 3 بوتات";


const positions =
["p0","p1","p2","p3"];


$("board").innerHTML =
bot.players.map(
(player,index)=>{

return `
<div
class="player ${positions[index]} ${index === bot.turn ? "active" : ""}"
>
${index ? "🤖" : "👤"}
<b>${escapeHTML(player.name)}</b>
<br>
<small>${player.hand.length} أوراق</small>
</div>
`;

}
).join("");

}


/* =========================
   START CONNECTION
========================= */

connect();

</script>

</body>
</html>
