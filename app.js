// Role Vault WEB v2 — الموقع (بدون توكن البوت) — يتصل بالبوت عبر API
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
  name: "rolevault.sid", secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: "auto", sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 },
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: "rolevault_web_sessions" })
}));

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sha = s => crypto.createHash("sha256").update(String(s)).digest();

// ============ التصميم ============
const css = `
:root{--bg:#070b14;--panel:#0f1729;--panel2:#16213b;--line:#22305a;--text:#f1f5ff;--muted:#8c9bbf;--accent:#3b82f6;--accent2:#22d3ee;--red:#e11d48;--green:#10b981;--radius:16px}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;color:var(--text);background:radial-gradient(900px 500px at 80% -10%,#12316b66,transparent),radial-gradient(700px 400px at 0% 0%,#0e7c8f44,transparent),var(--bg);font-family:"Tajawal",system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif}
a{color:var(--accent2);text-decoration:none}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 4%;border-bottom:1px solid var(--line);background:#070b14d9;backdrop-filter:blur(12px);position:sticky;top:0;z-index:5}
.brand{font-weight:900;font-size:21px}
.brand b{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.wrap{max-width:1100px;margin:18px auto;padding:0 14px}
.hero{padding:18px;border:1px solid var(--line);border-radius:22px;margin-bottom:14px;background:linear-gradient(135deg,#13234a,var(--panel) 70%)}
.hero h1{margin:0 0 6px;font-size:clamp(21px,4vw,30px)}
.muted{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px;margin-bottom:14px}
.card h2{margin:0 0 10px;font-size:18px}
.btn{border:0;border-radius:14px;padding:10px 16px;font:inherit;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--accent),#2563eb);display:inline-block;box-shadow:0 6px 18px #2563eb44;transition:transform .12s,filter .12s}
.btn:hover{filter:brightness(1.1)}.btn:active{transform:scale(.97)}
.btn.good{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 6px 18px #05966944}
.btn.danger{background:linear-gradient(135deg,#f43f5e,#be123c);box-shadow:0 6px 18px #be123c44}
.btn.secondary{background:var(--panel2);box-shadow:none;border:1px solid var(--line)}
.btn.sm{padding:6px 12px;font-size:13px}
.btn:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent2);outline-offset:2px}
input,select{background:#0a1122;color:var(--text);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;max-width:100%}
input[type=text],input[type=password],select.full{width:100%;margin:6px 0 12px}
select{max-width:100%}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:6px 0}
.roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;max-height:420px;overflow:auto;padding:10px 0}
.role{display:flex;align-items:center;gap:9px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px;min-width:0}
.role label{overflow-wrap:anywhere;cursor:pointer;flex:1}
.role small{color:var(--muted)}
.alert{padding:12px 14px;border-radius:12px;margin:10px 0;background:#18264a;border:1px solid var(--line)}
.alert.error{background:#3b1220;border-color:#9f1d3f}
.alert.ok{background:#0b2f25;border-color:#10805b}
.backup{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:14px 0}
.backup:last-child{border-bottom:0}
.login{max-width:400px;margin:12vh auto}
.footer{padding:20px;text-align:center;color:var(--muted);font-size:12px}
.restore{flex-basis:100%}
.restore>summary{list-style:none;cursor:pointer;display:inline-block}
.restore>summary::-webkit-details-marker{display:none}
.rpanel{margin-top:14px;border:1px solid var(--line);border-radius:14px;padding:14px;background:#0a1122}
.rcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:12px}
.rcols h3{margin:0 0 8px;font-size:15px}
.picklist,.preview{max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:8px;background:var(--panel)}
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
.log{max-height:300px;overflow:auto;background:#0a1122;border:1px solid var(--line);border-radius:12px;padding:10px;margin:10px 0;font-size:14px}
.ln{padding:3px 0;overflow-wrap:anywhere}
.ln.ok{color:#6ee7b7}.ln.error{color:#fda4af}.ln.warn{color:#fcd34d}.ln.info{color:var(--muted)}
.busy .btn:not(#pclose){pointer-events:none;opacity:.55}
/* تبويبات */
.tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 0 12px;position:sticky;top:58px;z-index:4;background:linear-gradient(var(--bg) 80%,transparent)}
.tab{flex:0 0 auto;border:1px solid var(--line);background:var(--panel2);color:var(--text);padding:9px 16px;border-radius:999px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}
.tab.on{background:linear-gradient(135deg,var(--accent),#2563eb);border-color:transparent}
.tab.red.on{background:linear-gradient(135deg,#f43f5e,#be123c)}
.top{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.top input{flex:1;min-width:150px;margin:0}
.chk{display:flex;align-items:center;gap:6px;font-weight:700;color:#fcd34d;white-space:nowrap}
/* الصلاحيات */
.gh{margin:16px 0 6px;padding-bottom:6px;border-bottom:1px solid var(--line);color:var(--accent2);font-size:16px}
.prm{display:flex;gap:12px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);margin:6px 0}
.prm input{width:22px;height:22px;margin-top:4px;flex:0 0 auto}
.prm.dng{border-color:#9f1d3f;background:#2a1020}
.pt b{font-size:16px}
.pt small.en{display:block;color:var(--muted);direction:ltr;text-align:right;font-size:12px}
.pt .muted{font-size:13px;margin-top:3px}
.wb{display:inline-block;margin-inline-start:8px;background:var(--red);color:#fff;border-radius:8px;padding:1px 8px;font-size:12px;font-weight:800}
.res{display:flex;gap:8px;padding:7px 4px;border-bottom:1px solid var(--line)}
.res .w{flex:1}.res small{display:block;color:var(--muted)}
.pr{padding:9px 12px;border-radius:10px;margin:5px 0;border:1px solid var(--line)}
.pr.danger{background:#3b1220;border-color:#9f1d3f}.pr.warn{background:#3a2a0b;border-color:#92661a}.pr.info{background:#18264a}.pr.ok{background:#0b2f25;border-color:#10805b}
.ch{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);margin:3px 0;overflow-wrap:anywhere}
.ch.sub{margin-inline-start:22px}
.ch.cat{background:#1b2a52;font-weight:800}
.dr{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);margin:3px 0;user-select:none;-webkit-user-select:none}
.dr.sub{margin-inline-start:24px}.dr.cat{background:#1b2a52;font-weight:800}
.dr.drag{opacity:.55;border-color:var(--accent2)}
.hd{cursor:grab;touch-action:none;padding:4px 10px;font-size:20px;color:var(--accent2)}
.lockbox{border:2px solid var(--red);background:#2a0d18}
.lockbox.on{animation:pulse 1.6s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 6px #e11d4833}}
.hist{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--line)}
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
  ${loggedIn ? `<div class="top" style="flex:1;max-width:520px">
    <input type="text" id="q" placeholder="🔍 بحث سريع عن رتبة أو روم…">
    <label class="chk"><input type="checkbox" id="dry"> وضع المعاينة</label>
    <a href="/logout">خروج</a></div>` : ""}
</header>
<main class="wrap">${body}</main>
<div class="footer">لا تشارك رابط لوحة التحكم أو كلمة السر</div>
</body>
</html>`;

// ============ الاتصال بالبوت ============
async function bot(path, method = "GET", body, actor = "") {
  let r;
  try {
    r = await fetch(BOT + path, {
      method,
      headers: { "content-type": "application/json", "x-api-key": BOT_API_KEY, "x-actor": encodeURIComponent("لوحة الموقع (" + actor + ")") },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch { throw new Error("تعذر الاتصال بالبوت. تأكد أن الاستضافة شغالة ورابط BOT_URL صحيح."); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || "خطأ من البوت.");
  return j;
}

// ============ الجلسة ============
function requireAuth(req, res, next) { if (!req.session.ok) return res.redirect("/login"); next(); }
function requireApi(req, res, next) {
  if (!req.session.ok) return res.status(401).json({ error: "انتهت الجلسة، حدّث الصفحة وسجّل دخول." });
  next();
}

const attempts = new Map();
const locked = ip => { const a = attempts.get(ip); return a && a.until > Date.now(); };

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

app.get("/login", (req, res) => { if (req.session.ok) return res.redirect("/"); res.send(loginPage()); });
app.post("/login", (req, res) => {
  const ip = req.ip;
  if (locked(ip)) return res.status(429).send(loginPage("محاولات كثيرة. انتظر 15 دقيقة."));
  if (crypto.timingSafeEqual(sha(req.body.password || ""), sha(SITE_PASSWORD))) {
    attempts.delete(ip);
    return req.session.regenerate(() => { req.session.ok = true; res.redirect("/"); });
  }
  const a = attempts.get(ip) || { n: 0, until: 0 };
  a.n++;
  if (a.n >= 5) { a.until = Date.now() + 15 * 60 * 1000; a.n = 0; }
  attempts.set(ip, a);
  res.status(401).send(loginPage("كلمة السر غير صحيحة."));
});
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login")));

// ============ كود الواجهة ============
const BUILD = Date.now();
const clientJs = String.raw`(function(){
var S=null,M=null,busy=false,chosen={},chCh={};
var DRY_OK={'/api/delete':1,'/api/restore':1,'/api/role-perms':1,'/api/copy-role':1,'/api/copy-channel':1,'/api/bulk':1,'/api/template':1,'/api/lockdown':1,'/api/reorder':1};
function $(i){return document.getElementById(i)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function dot(c){var s=el('span',null,'●');s.style.color=(c&&c!=='#000000')?c:'#8c9bbf';return s}
function api(path,method,body){
  return fetch(path,{method:method||'GET',credentials:'same-origin',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined})
  .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok||j.error)throw new Error(j.error||('خطأ '+r.status));return j;});});
}
function showMsg(t,type){var m=$('msg');m.textContent='';if(t)m.appendChild(el('div','alert '+(type||'error'),t))}
function icon(t){return t===4?'📁':(t===2||t===13)?'🔊':'#'}
function val(id){return $(id).value}

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
function runJob(title,path,body,free){
  if(busy&&!free){alert('فيه عملية شغالة الحين، انتظر تخلص.');return}
  body=body||{};if(DRY_OK[path]&&$('dry').checked)body.dry=true;
  busy=true;document.body.classList.add('busy');openProgress(title+(body.dry?' (معاينة)':''));
  api(path,'POST',body).then(function(j){return poll(j.jobId)})
  .catch(function(e){logLine('error',e.message)})
  .then(function(){busy=false;document.body.classList.remove('busy');$('pclose').hidden=false;return load()});
}

/* ===== التبويبات + البحث ===== */
function tab(name){
  ['roles','perms','chans','check','safe'].forEach(function(t){$('t-'+t).hidden=(t!==name);$('b-'+t).classList.toggle('on',t===name)});
  if(name==='safe')loadHistory();
}
function applyQ(){
  var q=val('q').trim().toLowerCase(),n=document.querySelectorAll('.srch');
  for(var i=0;i<n.length;i++)n[i].hidden=!!q&&n[i].textContent.toLowerCase().indexOf(q)<0;
}

/* ===== الرتب (حذف) ===== */
function updCount(){var n=0;for(var k in chosen)if(chosen[k])n++;$('count').textContent=n+' محدد'}
function removeRoleRow(id){
  var row=document.querySelector('#roles .role[data-id="'+id+'"]');if(row)row.remove();
  delete chosen[id];if(S)S.roles=S.roles.filter(function(r){return r.id!==id});updCount();
}
function renderRoles(){
  var box=$('roles');box.textContent='';var ids={};
  S.roles.forEach(function(r){
    ids[r.id]=1;
    var row=el('div','role srch');row.dataset.id=r.id;
    var cb=document.createElement('input');cb.type='checkbox';cb.id='r-'+r.id;cb.checked=!!chosen[r.id];
    cb.addEventListener('change',function(){chosen[r.id]=cb.checked;updCount()});
    var lab=el('label');lab.htmlFor=cb.id;lab.appendChild(dot(r.color));lab.appendChild(document.createTextNode(' '+r.name));
    row.appendChild(cb);row.appendChild(lab);row.appendChild(el('small',null,String(r.position)));
    box.appendChild(row);
  });
  for(var k in chosen)if(!ids[k])delete chosen[k];
  updCount();
}
function renderGuilds(){
  var s=$('guildSel');s.textContent='';
  S.guilds.forEach(function(g){var o=el('option',null,g.name);o.value=g.id;if(g.id===S.guildId)o.selected=true;s.appendChild(o)});
}

/* ===== النسخ + الاستعادة ===== */
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
  var roles=S.roles,G=gapsFor(roles),gaps=G.gaps,sel=G.order.length?G.order[0]:-1;
  var det=el('details','restore');
  det.appendChild(el('summary','btn good','استعادة… (اختيار الأجزاء والمكان)'));
  var panel=el('div','rpanel'),cols=el('div','rcols');
  var c1=el('div');c1.appendChild(el('h3',null,'الرتب (شيل علامة اللي ما تبيه)'));
  var pickBox=el('div','picklist');c1.appendChild(pickBox);
  var wcL=null,wc=null,chBox=null,cboxes=[];
  if(b.chans&&b.chans.length){
    wcL=el('label','pick');wc=document.createElement('input');wc.type='checkbox';wc.checked=true;
    wcL.appendChild(wc);wcL.appendChild(el('b',null,'مع الرومات والصلاحيات (تنربط بالرتب الجديدة تلقائياً)'));c1.appendChild(wcL);
    chBox=el('div','picklist');
    b.chans.forEach(function(c){
      var l=el('label','pick'),cb=document.createElement('input');cb.type='checkbox';cb.checked=true;cboxes.push({cb:cb,c:c});
      l.appendChild(cb);l.appendChild(el('span',null,icon(c.type)+' '+c.name));chBox.appendChild(l);
    });
    c1.appendChild(chBox);
  }
  var c2=el('div');c2.appendChild(el('h3',null,'مكان الرتب في «'+S.guildName+'» — اضغط الخط المتقطع للتغيير'));
  var prev=el('div','preview'),where=el('div','where');c2.appendChild(prev);c2.appendChild(where);
  cols.appendChild(c1);cols.appendChild(c2);panel.appendChild(cols);
  var go=el('button','btn good','استعادة');go.type='button';panel.appendChild(go);det.appendChild(panel);
  var boxes=[];
  b.roles.forEach(function(r){
    var lab=el('label','pick'),cb=document.createElement('input');cb.type='checkbox';cb.checked=true;cb.addEventListener('change',render);
    boxes.push({cb:cb,r:r});lab.appendChild(cb);lab.appendChild(dot(r.color));lab.appendChild(el('span',null,r.name));pickBox.appendChild(lab);
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
        }else{(function(idx){var g=el('button','gap','＋ حطها هنا');g.type='button';g.addEventListener('click',function(){sel=idx;render()});prev.appendChild(g)})(i)}
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
    var ch=checked(),withCh=!!(wc&&wc.checked),pc=cboxes.filter(function(x){return x.cb.checked}).map(function(x){return x.c.i});
    if(sel<0||(!ch.length&&!(withCh&&pc.length))){alert('حدد شي من النسخة ومكانه.');return}
    if(!$('dry').checked&&!confirm('استعادة '+ch.length+' رتبة'+(withCh?' و'+pc.length+' روم':'')+' — '+gaps[sel].label+' ؟'))return;
    runJob('الاستعادة','/api/restore',{backupId:b.id,anchorId:gaps[sel].anchorId,mode:gaps[sel].mode,pick:ch.map(function(r){return r.i}),withChannels:withCh,pickCh:pc});
  });
  render();return det;
}
function renderBackups(){
  var box=$('backups');box.textContent='';
  if(!S.backups.length){box.appendChild(el('p','muted','ما فيه نسخ محفوظة. اضغط «نسخ الآن».'));return}
  S.backups.forEach(function(b){
    var row=el('div','backup');
    var info=el('div');info.appendChild(el('b',null,(b.auto?'🕒 ':'')+(b.label||'نسخة')));
    info.appendChild(el('div','muted',new Date(b.createdAt).toLocaleString('ar-SA')+' · '+b.count+' رتبة'+(b.chans.length?' · '+b.chans.length+' روم':'')+(b.fromGuild?' · من: '+b.fromGuild:'')));
    var del=el('button','btn secondary','حذف النسخة');del.type='button';
    del.addEventListener('click',function(){
      if(!confirm('حذف النسخة الاحتياطية فقط؟'))return;
      api('/api/backup/delete','POST',{backupId:b.id}).then(function(){return load()}).catch(function(e){showMsg(e.message)});
    });
    row.appendChild(info);row.appendChild(del);row.appendChild(restorePanel(b));box.appendChild(row);
  });
}

/* ===== القوائم المنسدلة ===== */
function fillSel(id,arr,v,l,first){
  var s=$(id);if(!s)return;var old=s.value;s.textContent='';
  if(first){var o=el('option',null,first[1]);o.value=first[0];s.appendChild(o)}
  arr.forEach(function(x){var o=el('option',null,l(x));o.value=v(x);s.appendChild(o)});
  if(old)s.value=old;
}
function fillAll(){
  var rv=function(r){return r.id},rl=function(r){return r.name},cv=function(c){return c.id},cl=function(c){return icon(c.type)+' '+c.name};
  ['pr','cmpB','cpTo','tpRole'].forEach(function(i){fillSel(i,S.roles,rv,rl)});
  fillSel('bkT',S.roles,rv,rl,[S.guildId,'@everyone (الكل)']);
  var nc=S.channels.filter(function(c){return c.type!==4});
  ['ccA','ccB','efCh'].forEach(function(i){fillSel(i,nc,cv,cl)});
  fillSel('tpCat',S.channels.filter(function(c){return c.type===4}),cv,cl,['','بدون تصنيف']);
}

/* ===== الصلاحيات (عربي واضح + إنجليزي ملاحظة) ===== */
var ZERO=BigInt(0);
function renderPerm(){
  var box=$('permBox');box.textContent='';if(!M||!S)return;
  var r=S.roles.filter(function(x){return x.id===val('pr')})[0];if(!r)return;
  var cur=BigInt(r.perms);
  ['m','c','v','a'].forEach(function(g){
    box.appendChild(el('h3','gh',M.groups[g]));
    M.perms.filter(function(p){return p.g===g}).forEach(function(p){
      var row=el('div','prm srch'+(p.danger?' dng':'')),cb=document.createElement('input');
      cb.type='checkbox';cb.dataset.k=p.k;cb.dataset.d=p.danger?'1':'';cb.checked=(cur&BigInt(p.bit))!==ZERO;cb.dataset.o=cb.checked?'1':'0';
      var t=el('div','pt'),h=el('b',null,p.ar);
      if(p.danger)h.appendChild(el('span','wb','⚠️ خطيرة'));
      t.appendChild(h);t.appendChild(el('small','en',p.en));t.appendChild(el('div','muted',p.d));
      row.appendChild(cb);row.appendChild(t);box.appendChild(row);
    });
  });
}
function savePerms(){
  var set={},dng=[],boxes=$('permBox').querySelectorAll('input[type=checkbox]');
  for(var i=0;i<boxes.length;i++){var b=boxes[i];if((b.checked?'1':'0')!==b.dataset.o){set[b.dataset.k]=b.checked;if(b.checked&&b.dataset.d)dng.push(b.dataset.k)}}
  if(!Object.keys(set).length){alert('ما غيّرت شي.');return}
  if(dng.length&&!$('dry').checked&&!confirm('⚠️ تحذير: تعطي صلاحيات خطيرة ('+dng.join('، ')+'). متأكد؟'))return;
  runJob('تعديل الصلاحيات','/api/role-perms',{roleId:val('pr'),set:set});
}
function permName(k){var p=M.perms.filter(function(x){return x.k===k})[0];return p?p:{ar:k,en:''}}

/* ===== الرومات ===== */
function renderChans(){
  var box=$('chList');box.textContent='';
  S.channels.forEach(function(c){
    var row=el('div','ch srch'+(c.type===4?' cat':(c.parentId?' sub':'')));
    var cb=document.createElement('input');cb.type='checkbox';cb.checked=!!chCh[c.id];
    cb.addEventListener('change',function(){chCh[c.id]=cb.checked;var n=0;for(var k in chCh)if(chCh[k])n++;$('chCount').textContent=n+' محدد'});
    row.appendChild(cb);row.appendChild(el('span',null,icon(c.type)+' '+c.name));box.appendChild(row);
  });
  fillSel('bkP',M.perms,function(p){return p.k},function(p){return p.ar+' — '+p.en});
}

/* ===== ترتيب الرومات بالسحب والإفلات (يشتغل بالجوال) ===== */
function norm(){
  var rows=$('ordList').children,cur=null;
  for(var i=0;i<rows.length;i++){var r=rows[i];
    if(r.dataset.t==='4'){cur=r.dataset.id;r.classList.remove('sub');r.dataset.p=''}
    else if(cur){r.classList.add('sub');r.dataset.p=cur}
    else{r.classList.remove('sub');r.dataset.p=''}}
}
function grp(r){var g=[r];if(r.dataset.t==='4'){var n=r.nextSibling;while(n&&n.classList.contains('sub')){g.push(n);n=n.nextSibling}}return g}
function renderOrder(){
  var box=$('ordList');box.textContent='';
  S.channels.forEach(function(c){
    var row=el('div','dr srch'+(c.type===4?' cat':''));row.dataset.id=c.id;row.dataset.t=String(c.type);row.dataset.p=c.parentId||'';
    if(c.parentId)row.classList.add('sub');
    var h=el('span','hd','☰');row.appendChild(h);row.appendChild(el('span',null,icon(c.type)+' '+c.name));
    h.addEventListener('pointerdown',function(ev){
      ev.preventDefault();h.setPointerCapture(ev.pointerId);
      var items=grp(row);items.forEach(function(x){x.classList.add('drag')});
      function mv(e){
        var t=document.elementFromPoint(e.clientX,e.clientY);t=t&&t.closest?t.closest('.dr'):null;
        if(!t||items.indexOf(t)>=0)return;
        var head=t;
        if(row.dataset.t==='4'){while(head.classList.contains('sub')&&head.previousSibling)head=head.previousSibling}
        var rc=t.getBoundingClientRect(),after=e.clientY>rc.top+rc.height/2,ref;
        if(row.dataset.t==='4'){var hg=grp(head);ref=after?hg[hg.length-1].nextSibling:head}
        else ref=after?t.nextSibling:t;
        items.forEach(function(x){box.insertBefore(x,ref)});
        norm();
      }
      function up(){h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);items.forEach(function(x){x.classList.remove('drag')})}
      h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    });
    box.appendChild(row);
  });
  norm();
}
function saveOrder(){
  var rows=$('ordList').children,items=[],top=0,cnt={};
  for(var i=0;i<rows.length;i++){var r=rows[i],p=r.dataset.p;
    if(r.dataset.t==='4'||!p)items.push({id:r.dataset.id,parentId:null,position:top++});
    else{cnt[p]=cnt[p]||0;items.push({id:r.dataset.id,parentId:p,position:cnt[p]++})}}
  runJob('حفظ ترتيب الرومات','/api/reorder',{items:items});
}

/* ===== النتائج (معاينة / مقارنة / مشاكل) ===== */
function out(title){var o=$('out');o.hidden=false;$('otitle').textContent=title;$('obody').textContent='';o.scrollIntoView({behavior:'smooth',block:'start'});return $('obody')}
function resRow(ok,p,why){
  var r=el('div','res'),w=el('div','w'),h=el('b',null,p.ar||p);
  w.appendChild(h);if(p.en)w.appendChild(el('small',null,p.en));if(why)w.appendChild(el('small',null,why));
  r.appendChild(el('span',null,ok?'✅':'❌'));r.appendChild(w);return r;
}
function doEffective(){
  var q=val('efQ').trim();if(!q){alert('اكتب اسم العضو أو الآيدي.');return}
  api('/api/effective?q='+encodeURIComponent(q)+'&channelId='+encodeURIComponent(val('efCh'))).then(function(j){
    var b=out('صلاحيات «'+j.member+'» في «'+j.channel+'»');
    ['m','c','v','a'].forEach(function(g){
      b.appendChild(el('h3','gh',M.groups[g]));
      j.list.forEach(function(x){var p=M.perms.filter(function(y){return y.k===x.k})[0];if(p&&p.g===g)b.appendChild(resRow(x.ok,p,x.why))});
    });
  }).catch(function(e){showMsg(e.message)});
}
function doCompare(){
  api('/api/compare?a='+encodeURIComponent(val('pr'))+'&b='+encodeURIComponent(val('cmpB'))).then(function(j){
    var b=out('الفرق بين «'+j.a+'» و«'+j.b+'»');
    if(!j.diff.length){b.appendChild(el('p','muted','الصلاحيات متطابقة.'));return}
    j.diff.forEach(function(d){var p=permName(d.k);b.appendChild(resRow(true,p,d.a?'عند «'+j.a+'» فقط':'عند «'+j.b+'» فقط'))});
  }).catch(function(e){showMsg(e.message)});
}
function doProblems(){
  api('/api/problems').then(function(j){
    var b=out('كشف المشاكل');
    j.list.forEach(function(x){b.appendChild(el('div','pr '+x.t,({danger:'🔴 ',warn:'🟠 ',info:'🔵 ',ok:'🟢 '}[x.t]||'')+x.m))});
  }).catch(function(e){showMsg(e.message)});
}

/* ===== الأمان: قفل + سجل + إعدادات ===== */
function renderSafe(){
  var on=S.lock.active;
  $('lockBox').classList.toggle('on',on);
  $('lockState').textContent=on?'🔴 السيرفر مقفل حالياً':'🟢 السيرفر مفتوح';
  $('lockBtn').hidden=on;$('unlockBtn').hidden=!on;$('lockReason').hidden=on;$('lockClear').hidden=on;
  var ex=$('exempt');ex.textContent='';
  S.roles.forEach(function(r){
    var l=el('label','pick srch'),cb=document.createElement('input');cb.type='checkbox';cb.value=r.id;cb.checked=S.settings.exempt.indexOf(r.id)>=0;
    l.appendChild(cb);l.appendChild(dot(r.color));l.appendChild(el('span',null,r.name));ex.appendChild(l);
  });
  $('autoBk').checked=S.settings.auto;
}
function loadHistory(){
  api('/api/history').then(function(j){
    var box=$('hist');box.textContent='';
    if(!j.list.length)box.appendChild(el('p','muted','ما فيه عمليات بعد.'));
    j.list.forEach(function(h){
      var r=el('div','hist'),i=el('div');i.appendChild(el('b',null,h.action));
      i.appendChild(el('div','muted',new Date(h.at).toLocaleString('ar-SA')+' · بواسطة: '+decodeURIComponentSafe(h.actor)));
      r.appendChild(i);
      if(h.undoable){var u=el('button','btn secondary sm','↩️ تراجع');u.type='button';u.addEventListener('click',function(){if(confirm('التراجع عن «'+h.action+'»؟'))runJob('تراجع','/api/undo',{id:h.id})});r.appendChild(u)}
      box.appendChild(r);
    });
  }).catch(function(e){showMsg(e.message)});
}
function decodeURIComponentSafe(s){try{return decodeURIComponent(s)}catch(e){return s}}

/* ===== التحميل ===== */
function load(){
  var p=M?Promise.resolve():api('/api/meta').then(function(m){M=m});
  return p.then(function(){return api('/api/state')}).then(function(s){
    S=s;showMsg('');renderGuilds();renderRoles();renderBackups();fillAll();renderPerm();renderChans();renderOrder();renderSafe();applyQ();
  }).catch(function(e){showMsg(e.message)});
}

/* ===== الأحداث ===== */
['roles','perms','chans','check','safe'].forEach(function(t){$('b-'+t).addEventListener('click',function(){tab(t)})});
$('q').addEventListener('input',applyQ);
$('guildSel').addEventListener('change',function(){api('/api/guild','POST',{guildId:this.value}).then(function(){chosen={};chCh={};return load()}).catch(function(e){showMsg(e.message)})});
$('selectAll').addEventListener('click',function(){S.roles.forEach(function(r){chosen[r.id]=true});renderRoles()});
$('clearAll').addEventListener('click',function(){chosen={};renderRoles()});
$('backupBtn').addEventListener('click',function(){var i=$('label'),l=i.value;i.value='';runJob('نسخ الرتب والرومات','/api/backup',{label:l})});
$('deleteBtn').addEventListener('click',function(){
  var ids=Object.keys(chosen).filter(function(k){return chosen[k]});
  if(!ids.length){alert('حدد رتبة واحدة على الأقل.');return}
  if(!$('dry').checked&&!confirm('متأكد من حذف '+ids.length+' رتبة؟'))return;
  runJob('حذف الرتب','/api/delete',{roleIds:ids});
});
$('pclose').addEventListener('click',function(){$('progress').hidden=true});
$('oclose').addEventListener('click',function(){$('out').hidden=true});
$('pr').addEventListener('change',renderPerm);
$('savePerm').addEventListener('click',savePerms);
$('cmpBtn').addEventListener('click',doCompare);
$('cpRole').addEventListener('click',function(){
  if(val('pr')===val('cpTo')){alert('اختر رتبة ثانية.');return}
  if(!$('dry').checked&&!confirm('نسخ صلاحيات الرتبة المحددة فوق صلاحيات الهدف (تُستبدل)؟'))return;
  runJob('نسخ صلاحيات رتبة','/api/copy-role',{from:val('pr'),to:val('cpTo')});
});
$('ccBtn').addEventListener('click',function(){
  if(val('ccA')===val('ccB')){alert('اختر روميّن مختلفين.');return}
  if(!$('dry').checked&&!confirm('نسخ صلاحيات الروم الأول فوق الثاني (تُستبدل)؟'))return;
  runJob('نسخ صلاحيات روم','/api/copy-channel',{from:val('ccA'),to:val('ccB')});
});
$('chAll').addEventListener('click',function(){S.channels.forEach(function(c){if(c.type!==4)chCh[c.id]=true});renderChans();$('chCount').textContent=Object.keys(chCh).length+' محدد'});
$('chNone').addEventListener('click',function(){chCh={};renderChans();$('chCount').textContent='0 محدد'});
$('bulkBtn').addEventListener('click',function(){
  var ids=Object.keys(chCh).filter(function(k){return chCh[k]});
  if(!ids.length){alert('حدد روم واحد على الأقل.');return}
  runJob('تعديل جماعي','/api/bulk',{channelIds:ids,target:val('bkT'),perm:val('bkP'),value:val('bkV')});
});
$('tpBtn').addEventListener('click',function(){
  runJob('إنشاء روم من قالب','/api/template',{type:val('tpType'),name:val('tpName'),categoryId:val('tpCat'),staffRoleId:val('tpRole')});
});
$('ordSave').addEventListener('click',saveOrder);
$('ordReset').addEventListener('click',renderOrder);
$('efBtn').addEventListener('click',doEffective);
$('probBtn').addEventListener('click',doProblems);
$('lockBtn').addEventListener('click',function(){
  if(!$('dry').checked&&!confirm('🚨 قفل الطوارئ: تُخفى كل الرومات عن الجميع وينشأ روم تحذير. متأكد؟'))return;
  runJob('🚨 قفل الطوارئ','/api/lockdown',{reason:val('lockReason'),clearChannelId:val('lockClear').trim()},true);
});
$('unlockBtn').addEventListener('click',function(){if(confirm('فتح السيرفر وإرجاع كل الصلاحيات كما كانت؟'))runJob('فتح السيرفر','/api/unlock',{},true)});
$('saveSet').addEventListener('click',function(){
  var ex=[].slice.call($('exempt').querySelectorAll('input:checked')).map(function(x){return x.value});
  api('/api/settings','POST',{exempt:ex,auto:$('autoBk').checked}).then(function(){showMsg('تم حفظ الإعدادات.','ok');return load()}).catch(function(e){showMsg(e.message)});
});
load();
})();
`;

app.get("/client.js", requireAuth, (req, res) => {
  res.type("application/javascript").set("Cache-Control", "no-store").send(clientJs);
});

// ============ الصفحة الرئيسية ============
const sec = (id, inner) => `<div id="t-${id}" ${id === "roles" ? "" : "hidden"}>${inner}</div>`;
app.get("/", requireAuth, (req, res) => {
  res.send(layout("لوحة إدارة السيرفر", `
    <section class="hero">
      <h1>لوحة إدارة السيرفر</h1>
      <div class="row"><span class="muted">السيرفر الحالي:</span><select id="guildSel"></select></div>
      <div id="msg"></div>
    </section>

    <div class="tabs">
      <button class="tab on" id="b-roles" type="button">🗂️ الرتب والنسخ</button>
      <button class="tab" id="b-perms" type="button">🔑 الصلاحيات</button>
      <button class="tab" id="b-chans" type="button">💬 الرومات</button>
      <button class="tab" id="b-check" type="button">🔍 فحص ومقارنة</button>
      <button class="tab red" id="b-safe" type="button">🚨 الأمان والسجل</button>
    </div>

    <section class="card" id="progress" hidden>
      <h2 id="ptitle"></h2><div class="log" id="plog"></div>
      <button class="btn secondary" id="pclose" type="button" hidden>إغلاق</button>
    </section>
    <section class="card" id="out" hidden>
      <h2 id="otitle"></h2><div id="obody"></div>
      <button class="btn secondary sm" id="oclose" type="button">إغلاق</button>
    </section>

    ${sec("roles", `
    <div class="grid">
      <section class="card">
        <h2>نسخ السيرفر (رتب + رومات + صلاحيات)</h2>
        <p class="muted">يحفظ الرتب والرومات والتصنيفات وصلاحياتها. ينسخ تلقائياً كل يوم، وتقدر تنسخ يدوياً.</p>
        <label>اسم النسخة (اختياري)</label>
        <input type="text" id="label" maxlength="80" placeholder="مثال: قبل التحديث">
        <button class="btn good" type="button" id="backupBtn">نسخ الآن</button>
      </section>
      <section class="card">
        <h2>حذف الرتب المحددة</h2>
        <div class="row"><button type="button" class="btn secondary sm" id="selectAll">تحديد الكل</button>
        <button type="button" class="btn secondary sm" id="clearAll">إلغاء</button><span class="muted" id="count">0 محدد</span></div>
        <div class="roles" id="roles"></div>
        <div class="alert">الحذف يمكن التراجع عنه من تبويب الأمان، لكن الرتبة ترجع بدون أعضائها.</div>
        <button class="btn danger" type="button" id="deleteBtn">حذف الرتب المحددة</button>
      </section>
    </div>
    <section class="card"><h2>النسخ الاحتياطية والنقل بين السيرفرات</h2>
      <p class="muted">لنقل سيرفر كامل: غيّر السيرفر من القائمة فوق ثم افتح «استعادة» على نسخة السيرفر الأول.</p>
      <div id="backups"><p class="muted">جاري التحميل…</p></div></section>`)}

    ${sec("perms", `
    <section class="card">
      <h2>صلاحيات الرتب</h2>
      <p class="muted">اختر رتبة وعدّل صلاحياتها. الاسم بالعربي والإنجليزي تحته ملاحظة.</p>
      <select id="pr" class="full"></select>
      <div id="permBox"></div>
      <button class="btn good" type="button" id="savePerm">حفظ التعديلات</button>
    </section>
    <section class="card">
      <h2>نسخ صلاحيات الرتبة المحددة إلى رتبة ثانية</h2>
      <div class="row"><select id="cpTo"></select><button class="btn" type="button" id="cpRole">نسخ بضغطة</button></div>
      <h2 style="margin-top:18px">مقارنة الرتبة المحددة برتبة ثانية</h2>
      <div class="row"><select id="cmpB"></select><button class="btn secondary" type="button" id="cmpBtn">قارن</button></div>
    </section>`)}

    ${sec("chans", `
    <div class="grid">
      <section class="card">
        <h2>تعديل جماعي</h2>
        <p class="muted">حدد الرومات من القائمة تحت، ثم اختر الرتبة والصلاحية.</p>
        <label>الرتبة</label><select id="bkT" class="full"></select>
        <label>الصلاحية</label><select id="bkP" class="full"></select>
        <label>الإجراء</label>
        <select id="bkV" class="full"><option value="allow">سماح</option><option value="deny">منع</option><option value="neutral">إلغاء التخصيص</option></select>
        <button class="btn" type="button" id="bulkBtn">تطبيق على المحدد</button>
      </section>
      <section class="card">
        <h2>روم جاهز من قالب</h2>
        <select id="tpType" class="full">
          <option value="announce">📢 إعلانات (قراءة فقط)</option><option value="chat">💬 دردشة</option>
          <option value="staff">🔒 إدارة (مخفي)</option><option value="voice">🔊 صوت</option></select>
        <input type="text" id="tpName" maxlength="90" placeholder="اسم الروم (اختياري)">
        <label>التصنيف</label><select id="tpCat" class="full"></select>
        <label>رتبة الإدارة (لقالب الإدارة)</label><select id="tpRole" class="full"></select>
        <button class="btn good" type="button" id="tpBtn">إنشاء</button>
      </section>
      <section class="card">
        <h2>نسخ صلاحيات روم لروم</h2>
        <label>من</label><select id="ccA" class="full"></select>
        <label>إلى (تُستبدل صلاحياته)</label><select id="ccB" class="full"></select>
        <button class="btn" type="button" id="ccBtn">نسخ بضغطة</button>
      </section>
    </div>
    <section class="card">
      <h2>الرومات والتصنيفات</h2>
      <div class="row"><button type="button" class="btn secondary sm" id="chAll">تحديد الكل</button>
      <button type="button" class="btn secondary sm" id="chNone">إلغاء</button><span class="muted" id="chCount">0 محدد</span></div>
      <div id="chList"></div>
    </section>
    <section class="card">
      <h2>ترتيب الرومات والتصنيفات</h2>
      <p class="muted">اضغط على ☰ واسحب الروم لمكانه. اسحب التصنيف وتتحرك معه رومّاته. الروم يدخل تحت التصنيف اللي فوقه. بعدين اضغط «حفظ الترتيب».</p>
      <div id="ordList"></div>
      <div class="row"><button class="btn good" type="button" id="ordSave">حفظ الترتيب</button>
      <button class="btn secondary" type="button" id="ordReset">تراجع عن السحب</button></div>
    </section>`)}

    ${sec("check", `
    <section class="card">
      <h2>وش يقدر يسوي عضو في روم؟</h2>
      <input type="text" id="efQ" placeholder="اسم العضو أو الآيدي">
      <select id="efCh" class="full"></select>
      <button class="btn" type="button" id="efBtn">معاينة الصلاحيات الفعلية</button>
    </section>
    <section class="card">
      <h2>كشف المشاكل</h2>
      <p class="muted">رومات مفتوحة للكل بالغلط، رتب مكررة، رتب فاضية، وصلاحيات خطيرة.</p>
      <button class="btn secondary" type="button" id="probBtn">افحص السيرفر</button>
    </section>`)}

    ${sec("safe", `
    <section class="card lockbox" id="lockBox">
      <h2>🚨 قفل الطوارئ</h2>
      <p id="lockState" style="font-weight:800"></p>
      <p class="muted">وقت الهجوم أو الاشتباه: يخفي كل الرومات عن الجميع (حتى الرتب الأعلى من البوت) ما عدا مالك السيرفر والرتب المستثناة، وينشئ روم «سيرفر مغلق» برسالة تحذير طويلة، ويوقف الدعوات. الفتح يرجع كل شي كما كان.</p>
      <div class="alert error">⚠️ رتبة «مدير كامل» (Administrator) تتجاوز أي إخفاء، وديسكورد ما يسمح بحجبها.</div>
      <input type="text" id="lockReason" maxlength="300" placeholder="سبب القفل (اختياري)">
      <input type="text" id="lockClear" inputmode="numeric" placeholder="آيدي شات زوال الخطر (تنرسل فيه رسالة الفتح بالمنشن)">
      <button class="btn danger" type="button" id="lockBtn">🚨 قفل السيرفر الآن</button>
      <button class="btn good" type="button" id="unlockBtn" hidden>🔓 فتح السيرفر</button>
    </section>
    <section class="card">
      <h2>الإعدادات</h2>
      <p class="muted">رتب الملكية اللي تشوف الرومات وقت القفل (المالك نفسه دائماً يشوف):</p>
      <div class="roles" id="exempt"></div>
      <label class="pick"><input type="checkbox" id="autoBk"> نسخة احتياطية تلقائية يومياً</label>
      <button class="btn" type="button" id="saveSet">حفظ الإعدادات</button>
      <p class="muted">أوامر السلاش في ديسكورد: ‎/lockdown ‎/unlock ‎/backup ‎/check</p>
    </section>
    <section class="card"><h2>السجل (من غيّر وش ومتى)</h2><div id="hist"><p class="muted">جاري التحميل…</p></div></section>`)}

    <script src="/client.js?v=${BUILD}"></script>`, true));
});

// ============ API: يمرّر كل شي للبوت مع تثبيت السيرفر الحالي ============
app.use("/api", requireApi, async (req, res) => {
  try {
    if (req.path === "/guild" && req.method === "POST") {
      req.session.guildId = String((req.body && req.body.guildId) || "");
      return res.json({ ok: true });
    }
    const gid = req.session.guildId || "";
    let path = req.originalUrl;
    if (req.method === "GET") path += (path.includes("?") ? "&" : "?") + "guildId=" + encodeURIComponent(gid);
    const body = req.method === "GET" ? undefined : { ...req.body, guildId: gid };
    const j = await bot(path, req.method, body, req.ip);
    if (req.path === "/state") req.session.guildId = j.guildId;
    res.json(j);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/health", (req, res) => res.send("ok"));
app.listen(PORT, "0.0.0.0", () => console.log("Role Vault web on " + PORT));
