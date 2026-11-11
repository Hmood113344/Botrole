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

// ============ الصفحة الرئيسية ============
app.get("/", requireAuth, async (req, res) => {
  let state;
  try {
    state = await bot("/api/state?guildId=" + encodeURIComponent(req.session.guildId || ""));
    req.session.guildId = state.guildId;
  } catch (e) {
    return res.send(layout("لوحة التحكم", `
      <section class="hero"><h1>لوحة التحكم</h1>
        ${popFlash(req)}
        <div class="alert error">${esc(e.message)}</div>
        <a class="btn secondary" href="/">إعادة المحاولة</a>
      </section>`, true));
  }

  const roleHtml = state.roles.map(r => `
    <div class="role">
      <input type="checkbox" name="roleIds" value="${esc(r.id)}" id="r-${esc(r.id)}">
      <label for="r-${esc(r.id)}"><span style="color:${esc(r.color)}">●</span> ${esc(r.name)}</label>
      <small>${r.position}</small>
    </div>`).join("");

  const backupHtml = state.backups.length ? state.backups.map(b => `
    <div class="backup">
      <div>
        <b>${esc(b.label || "نسخة رتب")}</b>
        <div class="muted">${new Date(b.createdAt).toLocaleString("ar-SA")} · ${b.count} رتبة${b.fromGuild ? " · من: " + esc(b.fromGuild) : ""}</div>
      </div>
      <details class="restore">
        <summary class="btn good">استعادة الرتب… (اختيار المكان)</summary>
        <form method="post" action="/restore" class="rpanel" data-backup="${esc(b.id)}">
          <input type="hidden" name="backupId" value="${esc(b.id)}">
          <input type="hidden" name="anchorId" value="">
          <input type="hidden" name="mode" value="">
          <div class="rcols">
            <div>
              <h3>الرتب اللي بتنضاف (شيل علامة اللي ما تبيه)</h3>
              <div class="picklist"></div>
            </div>
            <div>
              <h3>معاينة المكان في «${esc(state.guildName)}» — اضغط على الخط المتقطع لتغيير المكان</h3>
              <div class="preview"></div>
              <div class="where"></div>
            </div>
          </div>
          <button class="btn good" type="submit">استعادة في المكان المحدد</button>
        </form>
      </details>
      <form method="post" action="/backup/delete">
        <input type="hidden" name="backupId" value="${esc(b.id)}">
        <button class="btn secondary" type="submit" onclick="return confirm('حذف النسخة الاحتياطية فقط؟')">حذف النسخة</button>
      </form>
    </div>`).join("") : `<p class="muted">ما فيه نسخ محفوظة. اضغط «نسخ الرتب الآن» لإنشاء أول نسخة.</p>`;

  const safeJson = x => JSON.stringify(x).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
  const rvData = {
    roles: state.roles.map(r => ({ id: r.id, name: r.name, color: r.color, editable: !!r.editable })),
    backups: Object.fromEntries(state.backups.map(b => [b.id, b.roles || []]))
  };

  res.send(layout("لوحة إدارة الرتب", `
    <section class="hero">
      <h1>لوحة إدارة الرتب</h1>
      <form method="post" action="/guild" class="row">
        <span class="muted">السيرفر الحالي:</span>
        <select name="guildId" onchange="this.form.submit()">
          ${state.guilds.map(x => `<option value="${esc(x.id)}" ${x.id === state.guildId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}
        </select>
      </form>
      ${popFlash(req)}
    </section>

    <div class="grid">
      <section class="card">
        <h2>نسخ جميع الرتب</h2>
        <p class="muted">يحفظ الاسم واللون والصلاحيات والترتيب لكل الرتب غير المُدارة.</p>
        <form method="post" action="/backup">
          <label>اسم النسخة (اختياري)</label>
          <input type="text" name="label" maxlength="80" placeholder="مثال: قبل التحديث">
          <button class="btn good" type="submit">نسخ الرتب الآن</button>
        </form>
      </section>

      <section class="card">
        <h2>حذف الرتب المحددة</h2>
        <form method="post" action="/roles/delete" id="deleteForm">
          <div class="row">
            <button type="button" class="btn secondary" id="selectAll">تحديد الكل</button>
            <button type="button" class="btn secondary" id="clearAll">إلغاء التحديد</button>
            <span class="muted" id="count">0 محدد</span>
          </div>
          <div class="roles">${roleHtml}</div>
          <div class="alert">الحذف نهائي. أنصحك تسوي نسخة احتياطية قبله.</div>
          <button class="btn danger" type="submit" onclick="return confirm('متأكد من حذف الرتب المحددة؟')">حذف الرتب المحددة</button>
        </form>
      </section>
    </div>

    <section class="card">
      <h2>النسخ الاحتياطية</h2>
      ${backupHtml}
    </section>

    <script>window.RV=${safeJson(rvData)};</script>
    <script>
    (function(){
      var RV=window.RV, roles=RV.roles;
      function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
      function dot(c){var s=el('span',null,'●');s.style.color=(c&&c!=='#000000')?c:'#8c9bbf';return s}

      // الأماكن المتاحة: بين كل رتبتين (بشرط يقدر البوت يوصلها)
      var gaps={}, order=[];
      for(var i=0;i<=roles.length;i++){
        var above=roles[i-1], below=roles[i], g=null;
        if(i>0 && above.editable) g={anchorId:above.id,mode:'below',label:'تحت رتبة «'+above.name+'»'};
        else if((i===0||!above.editable) && (i===roles.length||below.editable)) g={anchorId:'top',mode:'top',label:'أعلى الرتب (تحت رتبة البوت مباشرة)'};
        if(g){gaps[i]=g;order.push(i)}
      }

      document.querySelectorAll('form.rpanel').forEach(function(f){
        var list=RV.backups[f.dataset.backup]||[];
        var pickBox=f.querySelector('.picklist'), prev=f.querySelector('.preview'), where=f.querySelector('.where');
        var aIn=f.querySelector('[name=anchorId]'), mIn=f.querySelector('[name=mode]');
        var sel=order.length?order[0]:-1;

        list.forEach(function(r){
          var lab=el('label','pick');
          var cb=document.createElement('input');cb.type='checkbox';cb.name='pick';cb.value=r.i;cb.checked=true;
          cb.addEventListener('change',render);
          lab.appendChild(cb);lab.appendChild(dot(r.color));lab.appendChild(el('span',null,r.name));
          pickBox.appendChild(lab);
        });

        function checked(){return list.filter(function(r){
          var c=pickBox.querySelector('input[value="'+r.i+'"]');return c&&c.checked})}

        function render(){
          prev.textContent='';
          for(var i=0;i<=roles.length;i++){
            if(gaps[i]){
              if(i===sel){
                var nb=el('div','newblock'), ch=checked();
                if(!ch.length) nb.appendChild(el('div','muted','ما حددت أي رتبة'));
                ch.forEach(function(r){var c=el('div','chip');c.appendChild(dot(r.color));c.appendChild(el('span',null,r.name));c.appendChild(el('em',null,'جديد'));nb.appendChild(c)});
                prev.appendChild(nb);
              } else {
                (function(idx){var b=el('button','gap','＋ حطها هنا');b.type='button';
                  b.addEventListener('click',function(){sel=idx;render()});prev.appendChild(b)})(i);
              }
            }
            if(i<roles.length){
              var r=roles[i], row=el('div','prow'+(r.editable?'':' locked'));
              row.appendChild(dot(r.color));row.appendChild(el('span',null,r.name));
              if(!r.editable) row.appendChild(el('small',null,'🔒 أعلى من البوت'));
              prev.appendChild(row);
            }
          }
          if(sel>=0){aIn.value=gaps[sel].anchorId;mIn.value=gaps[sel].mode;where.textContent='المكان المحدد: '+gaps[sel].label}
          else where.textContent='ما فيه مكان متاح للبوت.';
        }

        f.addEventListener('submit',function(e){
          if(sel<0||!checked().length){e.preventDefault();alert('حدد رتبة واحدة على الأقل ومكانها.');return}
          if(!confirm('استعادة '+checked().length+' رتبة — '+gaps[sel].label+' ؟'))e.preventDefault();
        });
        render();
      });
    })();
    </script>

    <script>
      const boxes=[...document.querySelectorAll('input[name="roleIds"]')];
      const count=document.getElementById('count');
      const refresh=()=>count.textContent=boxes.filter(x=>x.checked).length+' محدد';
      document.getElementById('selectAll').onclick=()=>{boxes.forEach(x=>x.checked=true);refresh()};
      document.getElementById('clearAll').onclick=()=>{boxes.forEach(x=>x.checked=false);refresh()};
      boxes.forEach(x=>x.addEventListener('change',refresh));
      document.getElementById('deleteForm').addEventListener('submit',e=>{
        if(!boxes.some(x=>x.checked)){e.preventDefault();alert('حدد رتبة واحدة على الأقل.')}
      });
      refresh();
    </script>`, true));
});

// ============ العمليات ============
app.post("/guild", requireAuth, (req, res) => {
  req.session.guildId = String(req.body.guildId || "");
  res.redirect("/");
});

app.post("/backup", requireAuth, async (req, res) => {
  try {
    const r = await bot("/api/backup", "POST", { label: req.body.label, guildId: req.session.guildId });
    flash(req, `تم حفظ نسخة تشمل ${r.count} رتبة.`);
  } catch (e) { flash(req, e.message, "error"); }
  res.redirect("/");
});

app.post("/roles/delete", requireAuth, async (req, res) => {
  try {
    const ids = req.body.roleIds ? [].concat(req.body.roleIds).map(String) : [];
    const r = await bot("/api/delete", "POST", { roleIds: ids, guildId: req.session.guildId });
    flash(req, `تم حذف ${r.deleted} رتبة.` + (r.skipped ? ` تعذر حذف ${r.skipped} (أعلى من البوت أو مُدارة).` : ""));
  } catch (e) { flash(req, e.message, "error"); }
  res.redirect("/");
});

app.post("/restore", requireAuth, async (req, res) => {
  try {
    const pick = req.body.pick ? [].concat(req.body.pick).map(Number) : undefined;
    const r = await bot("/api/restore", "POST", {
      backupId: req.body.backupId, anchorId: req.body.anchorId, mode: req.body.mode,
      pick, guildId: req.session.guildId
    });
    flash(req, `تمت استعادة ${r.restored} رتبة في المكان المحدد.` + (r.failed ? ` تعذر إنشاء ${r.failed} (غالبا صلاحيات البوت أقل من صلاحيات الرتبة).` : ""));
  } catch (e) { flash(req, e.message, "error"); }
  res.redirect("/");
});

app.post("/backup/delete", requireAuth, async (req, res) => {
  try {
    const r = await bot("/api/backup/delete", "POST", { backupId: req.body.backupId });
    flash(req, r.deleted ? "تم حذف النسخة الاحتياطية." : "النسخة غير موجودة.");
  } catch (e) { flash(req, e.message, "error"); }
  res.redirect("/");
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, "0.0.0.0", () => console.log("Role Vault web on " + PORT));
