// Role Vault WEB — الموقع (بدون توكن البوت) — يتصل بالبوت عبر API
// متغيرات Render: SITE_PASSWORD, SESSION_SECRET, MONGODB_URI, BOT_URL, BOT_API_KEY
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const crypto = require("crypto");

const { SITE_PASSWORD, SESSION_SECRET, MONGODB_URI, BOT_URL, BOT_API_KEY } = process.env;
const PORT = process.env.PORT || 10000;

if (!SITE_PASSWORD || !SESSION_SECRET || !MONGODB_URI || !BOT_URL || !BOT_API_KEY) {
  console.error("Missing env: SITE_PASSWORD, SESSION_SECRET, MONGODB_URI, BOT_URL, BOT_API_KEY");
  process.exit(1);
}

const BOT = BOT_URL.replace(/\/+$/, "");

const app = express();
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));

app.use(session({
  name: "rolevault.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: "auto", sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 },
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: "rolevault_web_sessions" })
}));

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const sha = s => crypto.createHash("sha256").update(String(s)).digest();

// ============ التصميم (غيّر الألوان من هنا) ============
const css = `
:root{
  --bg:#070b14;
  --panel:#0f1729;
  --panel2:#16213b;
  --line:#22305a;
  --text:#f1f5ff;
  --muted:#8c9bbf;
  --accent:#3b82f6;
  --accent2:#22d3ee;
  --red:#e11d48;
  --green:#10b981;
  --radius:16px;
}
*{box-sizing:border-box}
body{
  margin:0;min-height:100vh;color:var(--text);
  background:radial-gradient(900px 500px at 80% -10%,#12316b66,transparent),
             radial-gradient(700px 400px at 0% 0%,#0e7c8f44,transparent),var(--bg);
  font-family:"Tajawal",system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;
}
a{color:var(--accent2);text-decoration:none}
header{
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:16px 5%;border-bottom:1px solid var(--line);
  background:#070b14d9;backdrop-filter:blur(12px);position:sticky;top:0;z-index:5;
}
.brand{font-weight:900;font-size:22px;letter-spacing:.5px}
.brand b{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.wrap{max-width:1100px;margin:26px auto;padding:0 16px}
.hero{
  padding:24px;border:1px solid var(--line);border-radius:22px;margin-bottom:18px;
  background:linear-gradient(135deg,#13234a,var(--panel) 70%);
}
.hero h1{margin:0 0 6px;font-size:clamp(22px,4vw,32px)}
.muted{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card h2{margin:0 0 10px;font-size:19px}
.btn{
  border:0;border-radius:14px;padding:11px 18px;font:inherit;font-weight:800;color:#fff;cursor:pointer;
  background:linear-gradient(135deg,var(--accent),#2563eb);display:inline-block;
  box-shadow:0 6px 18px #2563eb44;transition:transform .12s,filter .12s;
}
.btn:hover{filter:brightness(1.1)}
.btn:active{transform:scale(.97)}
.btn.good{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 6px 18px #05966944}
.btn.danger{background:linear-gradient(135deg,#f43f5e,#be123c);box-shadow:0 6px 18px #be123c44}
.btn.secondary{background:var(--panel2);box-shadow:none;border:1px solid var(--line)}
.btn:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent2);outline-offset:2px}
input,select{
  background:#0a1122;color:var(--text);border:1px solid var(--line);border-radius:12px;
  padding:11px 12px;font:inherit;max-width:100%;
}
input[type=text],input[type=password]{width:100%;margin:6px 0 12px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.roles{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;
  max-height:440px;overflow:auto;padding:10px 0;
}
.role{
  display:flex;align-items:center;gap:9px;background:var(--panel2);
  border:1px solid var(--line);border-radius:12px;padding:10px;min-width:0;
}
.role label{overflow-wrap:anywhere;cursor:pointer;flex:1}
.role small{color:var(--muted)}
.alert{padding:12px 14px;border-radius:12px;margin:12px 0;background:#18264a;border:1px solid var(--line)}
.alert.error{background:#3b1220;border-color:#9f1d3f}
.alert.ok{background:#0b2f25;border-color:#10805b}
.backup{
  display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;
  border-bottom:1px solid var(--line);padding:14px 0;
}
.backup:last-child{border-bottom:0}
.login{max-width:400px;margin:12vh auto}
.footer{padding:20px;text-align:center;color:var(--muted);font-size:12px}

.restore{flex-basis:100%}
.restore>summary{list-style:none;cursor:pointer;display:inline-block}
.restore>summary::-webkit-details-marker{display:none}
.rpanel{margin-top:14px;border:1px solid var(--line);border-radius:14px;padding:14px;background:#0a1122}
.rcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:12px}
.rcols h3{margin:0 0 8px;font-size:15px}
.picklist,.preview{max-height:380px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:8px;background:var(--panel)}
.pick{display:flex;align-items:center;gap:8px;padding:6px 4px;overflow-wrap:anywhere}
.prow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);margin:3px 0;overflow-wrap:anywhere}
.prow.locked{opacity:.45}
.prow small{margin-inline-start:auto;color:var(--muted)}
.gap{display:block;width:100%;border:1px dashed var(--line);background:transparent;color:var(--muted);border-radius:8px;padding:3px;font:inherit;font-size:12px;cursor:pointer;margin:2px 0;opacity:.55}
.gap:hover{opacity:1;border-color:var(--accent2);color:var(--accent2)}
.newblock{border:2px solid var(--green);background:#0b2f25;border-radius:12px;padding:6px;margin:4px 0}
.chip{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:#10805b33;margin:3px 0;overflow-wrap:anywhere}
.chip em{margin-inline-start:auto;font-style:normal;font-size:11px;background:var(--green);color:#fff;border-radius:6px;padding:1px 6px}
.where{margin:8px 0 0;font-size:14px}

[hidden]{display:none!important}
.log{max-height:320px;overflow:auto;background:#0a1122;border:1px solid var(--line);border-radius:12px;padding:10px;margin:10px 0;font-size:14px}
.ln{padding:3px 0;overflow-wrap:anywhere}
.ln.ok{color:#6ee7b7}.ln.error{color:#fda4af}.ln.warn{color:#fcd34d}.ln.info{color:var(--muted)}
.busy .btn:not(#pclose){pointer-events:none;opacity:.55}
`;

const layout = (title, body, loggedIn) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header>
  <div class="brand">ROLE <b>VAULT</b></div>
  <div>${loggedIn ? `<a href="/logout">تسجيل خروج</a>` : ""}</div>
</header>
<main class="wrap">${body}</main>
<div class="footer">لا تشارك رابط لوحة التحكم أو كلمة السر</div>
</body>
</html>`;

// ============ الاتصال بالبوت ============
async function bot(path, method = "GET", body) {
  let r;
  try {
    r = await fetch(BOT + path, {
      method,
      headers: { "content-type": "application/json", "x-api-key": BOT_API_KEY },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("تعذر الاتصال بالبوت. تأكد أن الاستضافة شغالة ورابط BOT_URL صحيح.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || "خطأ من البوت.");
  return j;
}

// ============ الجلسة والتنبيهات ============
function requireAuth(req, res, next) {
  if (!req.session.ok) return res.redirect("/login");
  next();
}
function flash(req, msg, type = "ok") { req.session.flash = { msg, type }; }
function popFlash(req) {
  const f = req.session.flash;
  req.session.flash = null;
  return f ? `<div class="alert ${f.type}">${esc(f.msg)}</div>` : "";
}

// ============ صفحة كلمة السر (حماية من التخمين) ============
const attempts = new Map(); // ip -> { n, until }
function locked(ip) {
  const a = attempts.get(ip);
  return a && a.until > Date.now();
}

const loginPage = (err = "") => layout("دخول", `
  <section class="card login">
    <h2>الدخول للوحة</h2>
    <p class="muted">اكتب كلمة السر للمتابعة.</p>
    ${err ? `<div class="alert error">${esc(err)}</div>` : ""}
    <form method="post" action="/login">
      <input type="password" name="password" placeholder="كلمة السر" autocomplete="current-password" autofocus required>
      <button class="btn" type="submit" style="width:100%">دخول</button>
    </form>
  </section>`, false);

app.get("/login", (req, res) => {
  if (req.session.ok) return res.redirect("/");
  res.send(loginPage());
});

app.post("/login", (req, res) => {
  const ip = req.ip;
  if (locked(ip)) return res.status(429).send(loginPage("محاولات كثيرة. انتظر 15 دقيقة."));

  const given = sha(req.body.password || "");
  if (crypto.timingSafeEqual(given, sha(SITE_PASSWORD))) {
    attempts.delete(ip);
    return req.session.regenerate(() => {
      req.session.ok = true;
      res.redirect("/");
    });
  }

  const a = attempts.get(ip) || { n: 0, until: 0 };
  a.n++;
  if (a.n >= 5) { a.until = Date.now() + 15 * 60 * 1000; a.n = 0; }
  attempts.set(ip, a);
  res.status(401).send(loginPage("كلمة السر غير صحيحة."));
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

// ============ كود الواجهة (يتحدث مباشرة بدون ريفرش) ============
const BUILD = Date.now();
const clientJs = String.raw`(function(){
var S=null,busy=false,chosen={};
function $(i){return document.getElementById(i)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function dot(c){var s=el('span',null,'●');s.style.color=(c&&c!=='#000000')?c:'#8c9bbf';return s}
function api(path,method,body){
  return fetch(path,{method:method||'GET',credentials:'same-origin',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined})
  .then(function(r){return r.json().catch(function(){return {}}).then(function(j){
    if(!r.ok||j.error)throw new Error(j.error||('خطأ '+r.status));
    return j;});});
}
function showMsg(t,type){var m=$('msg');m.textContent='';if(t)m.appendChild(el('div','alert '+(type||'error'),t))}

/* ===== التقدم المباشر ===== */
var ICON={ok:'✅',error:'❌',warn:'⚠️',info:'ℹ️'};
function logLine(type,msg){var l=$('plog');l.appendChild(el('div','ln '+type,(ICON[type]||'•')+' '+msg));l.scrollTop=l.scrollHeight}
function openProgress(title){var p=$('progress');p.hidden=false;$('ptitle').textContent=title;$('plog').textContent='';$('pclose').hidden=true;p.scrollIntoView({behavior:'smooth',block:'start'})}
function poll(id){
  var since=0,fails=0;
  return new Promise(function(resolve){
    (function tick(){
      api('/api/job/'+encodeURIComponent(id)+'?since='+since).then(function(j){
        fails=0;
        j.events.forEach(function(ev){logLine(ev.type,ev.msg);if(ev.roleId)removeRoleRow(ev.roleId)});
        since=j.next;
        if(j.done)return resolve(j);
        setTimeout(tick,600);
      }).catch(function(e){
        if(++fails>15){logLine('error','انقطع الاتصال: '+e.message);return resolve(null)}
        setTimeout(tick,2000);
      });
    })();
  });
}
function runJob(title,path,body){
  if(busy){alert('فيه عملية شغالة الحين، انتظر تخلص.');return}
  busy=true;document.body.classList.add('busy');openProgress(title);
  api(path,'POST',body).then(function(j){return poll(j.jobId)})
  .catch(function(e){logLine('error',e.message)})
  .then(function(){busy=false;document.body.classList.remove('busy');$('pclose').hidden=false;return load()});
}

/* ===== الرتب (حذف) ===== */
function updCount(){var n=0;for(var k in chosen)if(chosen[k])n++;$('count').textContent=n+' محدد'}
function removeRoleRow(id){
  var row=document.querySelector('#roles .role[data-id="'+id+'"]');if(row)row.remove();
  delete chosen[id];
  if(S)S.roles=S.roles.filter(function(r){return r.id!==id});
  updCount();
}
function renderRoles(){
  var box=$('roles');box.textContent='';var ids={};
  S.roles.forEach(function(r){
    ids[r.id]=1;
    var row=el('div','role');row.dataset.id=r.id;
    var cb=document.createElement('input');cb.type='checkbox';cb.id='r-'+r.id;cb.checked=!!chosen[r.id];
    cb.addEventListener('change',function(){chosen[r.id]=cb.checked;updCount()});
    var lab=el('label');lab.htmlFor=cb.id;lab.appendChild(dot(r.color));lab.appendChild(document.createTextNode(' '+r.name));
    row.appendChild(cb);row.appendChild(lab);row.appendChild(el('small',null,String(r.position)));
    box.appendChild(row);
  });
  for(var k in chosen)if(!ids[k])delete chosen[k];
  updCount();
}

/* ===== السيرفرات ===== */
function renderGuilds(){
  var s=$('guildSel');s.textContent='';
  S.guilds.forEach(function(g){var o=el('option',null,g.name);o.value=g.id;if(g.id===S.guildId)o.selected=true;s.appendChild(o)});
}

/* ===== النسخ + اختيار المكان ===== */
function gapsFor(roles){
  var gaps={},order=[];
  for(var i=0;i<=roles.length;i++){
    var above=roles[i-1],below=roles[i],g=null;
    if(i>0&&above.editable)g={anchorId:above.id,mode:'below',label:'تحت رتبة «'+above.name+'»'};
    else if((i===0||!above.editable)&&(i===roles.length||below.editable))g={anchorId:'top',mode:'top',label:'أعلى الرتب (تحت رتبة البوت مباشرة)'};
    if(g){gaps[i]=g;order.push(i)}
  }
  return {gaps:gaps,order:order};
}
function restorePanel(b){
  var roles=S.roles,G=gapsFor(roles),gaps=G.gaps;
  var sel=G.order.length?G.order[0]:-1;
  var det=el('details','restore');
  det.appendChild(el('summary','btn good','استعادة الرتب… (اختيار المكان)'));
  var panel=el('div','rpanel');
  var cols=el('div','rcols');
  var c1=el('div');c1.appendChild(el('h3',null,'الرتب اللي بتنضاف (شيل علامة اللي ما تبيه)'));
  var pickBox=el('div','picklist');c1.appendChild(pickBox);
  var c2=el('div');c2.appendChild(el('h3',null,'معاينة المكان في «'+S.guildName+'» — اضغط على الخط المتقطع لتغيير المكان'));
  var prev=el('div','preview');var where=el('div','where');c2.appendChild(prev);c2.appendChild(where);
  cols.appendChild(c1);cols.appendChild(c2);panel.appendChild(cols);
  var go=el('button','btn good','استعادة في المكان المحدد');go.type='button';panel.appendChild(go);
  det.appendChild(panel);

  var boxes=[];
  b.roles.forEach(function(r){
    var lab=el('label','pick');
    var cb=document.createElement('input');cb.type='checkbox';cb.checked=true;cb.addEventListener('change',render);
    boxes.push({cb:cb,r:r});
    lab.appendChild(cb);lab.appendChild(dot(r.color));lab.appendChild(el('span',null,r.name));
    pickBox.appendChild(lab);
  });
  function checked(){return boxes.filter(function(x){return x.cb.checked}).map(function(x){return x.r})}
  function render(){
    prev.textContent='';
    for(var i=0;i<=roles.length;i++){
      if(gaps[i]){
        if(i===sel){
          var nb=el('div','newblock'),ch=checked();
          if(!ch.length)nb.appendChild(el('div','muted','ما حددت أي رتبة'));
          ch.forEach(function(r){var c=el('div','chip');c.appendChild(dot(r.color));c.appendChild(el('span',null,r.name));c.appendChild(el('em',null,'جديد'));nb.appendChild(c)});
          prev.appendChild(nb);
        }else{
          (function(idx){var g=el('button','gap','＋ حطها هنا');g.type='button';g.addEventListener('click',function(){sel=idx;render()});prev.appendChild(g)})(i);
        }
      }
      if(i<roles.length){
        var r=roles[i],row=el('div','prow'+(r.editable?'':' locked'));
        row.appendChild(dot(r.color));row.appendChild(el('span',null,r.name));
        if(!r.editable)row.appendChild(el('small',null,'🔒 أعلى من البوت'));
        prev.appendChild(row);
      }
    }
    where.textContent=sel>=0?('المكان المحدد: '+gaps[sel].label):'ما فيه مكان متاح للبوت.';
  }
  go.addEventListener('click',function(){
    var ch=checked();
    if(sel<0||!ch.length){alert('حدد رتبة واحدة على الأقل ومكانها.');return}
    if(!confirm('استعادة '+ch.length+' رتبة — '+gaps[sel].label+' ؟'))return;
    runJob('استعادة الرتب','/api/restore',{backupId:b.id,anchorId:gaps[sel].anchorId,mode:gaps[sel].mode,pick:ch.map(function(r){return r.i})});
  });
  render();
  return det;
}
function renderBackups(){
  var box=$('backups');box.textContent='';
  if(!S.backups.length){box.appendChild(el('p','muted','ما فيه نسخ محفوظة. اضغط «نسخ الرتب الآن» لإنشاء أول نسخة.'));return}
  S.backups.forEach(function(b){
    var row=el('div','backup');
    var info=el('div');info.appendChild(el('b',null,b.label||'نسخة رتب'));
    info.appendChild(el('div','muted',new Date(b.createdAt).toLocaleString('ar-SA')+' · '+b.count+' رتبة'+(b.fromGuild?' · من: '+b.fromGuild:'')));
    var del=el('button','btn secondary','حذف النسخة');del.type='button';
    del.addEventListener('click',function(){
      if(!confirm('حذف النسخة الاحتياطية فقط؟'))return;
      api('/api/backup/delete','POST',{backupId:b.id}).then(function(){return load()}).catch(function(e){showMsg(e.message)});
    });
    row.appendChild(info);row.appendChild(del);row.appendChild(restorePanel(b));
    box.appendChild(row);
  });
}

/* ===== التحميل ===== */
function load(){
  return api('/api/state').then(function(s){S=s;showMsg('');renderGuilds();renderRoles();renderBackups()})
  .catch(function(e){showMsg(e.message)});
}

$('guildSel').addEventListener('change',function(){
  api('/api/guild','POST',{guildId:this.value}).then(function(){return load()}).catch(function(e){showMsg(e.message)});
});
$('selectAll').addEventListener('click',function(){S.roles.forEach(function(r){chosen[r.id]=true});renderRoles()});
$('clearAll').addEventListener('click',function(){chosen={};renderRoles()});
$('backupBtn').addEventListener('click',function(){
  var inp=$('label'),label=inp.value;inp.value='';
  runJob('نسخ الرتب','/api/backup',{label:label});
});
$('deleteBtn').addEventListener('click',function(){
  var ids=Object.keys(chosen).filter(function(k){return chosen[k]});
  if(!ids.length){alert('حدد رتبة واحدة على الأقل.');return}
  if(!confirm('متأكد من حذف '+ids.length+' رتبة؟'))return;
  runJob('حذف الرتب','/api/delete',{roleIds:ids});
});
$('pclose').addEventListener('click',function(){$('progress').hidden=true});
load();
})();
`;

app.get("/client.js", requireAuth, (req, res) => {
  res.type("application/javascript").set("Cache-Control", "no-store").send(clientJs);
});

// ============ الصفحة الرئيسية ============
app.get("/", requireAuth, (req, res) => {
  res.send(layout("لوحة إدارة الرتب", `
    <section class="hero">
      <h1>لوحة إدارة الرتب</h1>
      <div class="row">
        <span class="muted">السيرفر الحالي:</span>
        <select id="guildSel"></select>
      </div>
      <div id="msg"></div>
    </section>

    <section class="card" id="progress" hidden>
      <h2 id="ptitle"></h2>
      <div class="log" id="plog"></div>
      <button class="btn secondary" id="pclose" type="button" hidden>إغلاق</button>
    </section>

    <div class="grid">
      <section class="card">
        <h2>نسخ جميع الرتب</h2>
        <p class="muted">يحفظ الاسم واللون والصلاحيات والترتيب لكل الرتب غير المُدارة.</p>
        <label>اسم النسخة (اختياري)</label>
        <input type="text" id="label" maxlength="80" placeholder="مثال: قبل التحديث">
        <button class="btn good" type="button" id="backupBtn">نسخ الرتب الآن</button>
      </section>

      <section class="card">
        <h2>حذف الرتب المحددة</h2>
        <div class="row">
          <button type="button" class="btn secondary" id="selectAll">تحديد الكل</button>
          <button type="button" class="btn secondary" id="clearAll">إلغاء التحديد</button>
          <span class="muted" id="count">0 محدد</span>
        </div>
        <div class="roles" id="roles"></div>
        <div class="alert">الحذف نهائي. أنصحك تسوي نسخة احتياطية قبله.</div>
        <button class="btn danger" type="button" id="deleteBtn">حذف الرتب المحددة</button>
      </section>
    </div>

    <section class="card">
      <h2>النسخ الاحتياطية</h2>
      <div id="backups"><p class="muted">جاري التحميل…</p></div>
    </section>

    <script src="/client.js?v=${BUILD}"></script>`, true));
});

// ============ API للواجهة (تتصل بالبوت) ============
function requireApi(req, res, next) {
  if (!req.session.ok) return res.status(401).json({ error: "انتهت الجلسة، حدّث الصفحة وسجّل دخول." });
  next();
}
const wrap = fn => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

app.get("/api/state", requireApi, wrap(async req => {
  const s = await bot("/api/state?guildId=" + encodeURIComponent(req.session.guildId || ""));
  req.session.guildId = s.guildId;
  return s;
}));

app.post("/api/guild", requireApi, wrap(async req => {
  req.session.guildId = String((req.body && req.body.guildId) || "");
  return { ok: true };
}));

app.post("/api/backup", requireApi, wrap(req =>
  bot("/api/backup", "POST", { label: req.body.label, guildId: req.session.guildId })));

app.post("/api/delete", requireApi, wrap(req =>
  bot("/api/delete", "POST", { roleIds: req.body.roleIds, guildId: req.session.guildId })));

app.post("/api/restore", requireApi, wrap(req =>
  bot("/api/restore", "POST", {
    backupId: req.body.backupId, anchorId: req.body.anchorId, mode: req.body.mode,
    pick: req.body.pick, guildId: req.session.guildId
  })));

app.post("/api/backup/delete", requireApi, wrap(req =>
  bot("/api/backup/delete", "POST", { backupId: req.body.backupId })));

app.get("/api/job/:id", requireApi, wrap(req =>
  bot("/api/job/" + encodeURIComponent(req.params.id) + "?since=" + encodeURIComponent(req.query.since || 0))));

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, "0.0.0.0", () => console.log("Role Vault web on " + PORT));
