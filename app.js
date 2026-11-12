// Role Vault WEB v3 — الموقع (بدون توكن البوت) — يتصل بالبوت عبر API
// متغيرات Render: SITE_PASSWORD, SESSION_SECRET, MONGODB_URI, BOT_URL, BOT_API_KEY
// ربط القفل مع المواقع (اختياري): FLASH_MONGO_URI (قاعدة فلاش) , LOCK_SYNC_URIS (قواعد مواقع ثانية بفاصلة) , LOCK_SYNC_GUILD_ID (آيدي سيرفر وزارة الداخلية)
// v3.1: تبويب «طلبات البوتات» (قبول/رفض البوتات الجديدة) — يحتاج بوت v2.1 (bot_3.js المعدّل)
// v3: تحديث فوري لكل المتصلين (SSE) + نوافذ وقوائم من تصميم الموقع بدل نوافذ الآيفون + تصميم جديد
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const crypto = require("crypto");

const { SITE_PASSWORD, SESSION_SECRET, MONGODB_URI, BOT_URL, BOT_API_KEY, FLASH_MONGO_URI, LOCK_SYNC_URIS, LOCK_SYNC_GUILD_ID } = process.env;
const SYNC_URIS = [...new Set([FLASH_MONGO_URI, ...String(LOCK_SYNC_URIS || "").split(",")].map(s => String(s || "").trim()).filter(Boolean))];
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
:root{color-scheme:dark;--bg:#050912;--panel:#0d1527;--panel2:#131e38;--panel3:#1a2849;--line:#1f2d52;--line2:#2d4070;--text:#eef3ff;--muted:#8d9cc2;--accent:#4f8cff;--accent2:#22d3ee;--red:#f43f5e;--green:#10b981;--amber:#f59e0b;--radius:18px;--hh:64px}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth}
html.nosc,html.nosc body{overflow:hidden}
body{margin:0;min-height:100vh;min-height:100dvh;color:var(--text);background:var(--bg);font-family:"Tajawal",system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased;padding-bottom:env(safe-area-inset-bottom)}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(900px 520px at 85% -8%,#1b3f8f55,transparent 70%),radial-gradient(700px 420px at 0% 0%,#0e7c8f3a,transparent 70%),radial-gradient(600px 400px at 50% 110%,#4f46e51f,transparent 70%)}
a{color:var(--accent2);text-decoration:none}
button{-webkit-appearance:none;appearance:none;touch-action:manipulation}
[hidden]{display:none!important}
.muted{color:var(--muted)}
label{font-weight:700;font-size:14px;color:#c7d3f2}

/* الهيدر */
header{position:sticky;top:0;z-index:20;padding:calc(10px + env(safe-area-inset-top)) max(4%,env(safe-area-inset-right)) 10px max(4%,env(safe-area-inset-left));border-bottom:1px solid var(--line);background:#060b16d9;-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%)}
.hrow{display:flex;align-items:center;gap:10px;max-width:1100px;margin:0 auto}
.hrow.r2{margin-top:9px}
.brand{display:flex;align-items:center;gap:10px;font-weight:900;font-size:20px;letter-spacing:.5px}
.logo{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 6px 18px #22d3ee33;font-size:17px}
.brand b{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.sp{flex:1}
.live{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:800;background:#0b2f2566;border:1px solid #10805b88;color:#6ee7b7;white-space:nowrap}
.live i{width:8px;height:8px;border-radius:50%;background:#34d399;animation:ping 1.8s infinite}
.live.off{background:#3b122066;border-color:#9f1d3f88;color:#fda4af}
.live.off i{background:#fb7185;animation:none}
@keyframes ping{0%{box-shadow:0 0 0 0 #34d39999}70%{box-shadow:0 0 0 7px #34d39900}100%{box-shadow:0 0 0 0 #34d39900}}
.exit{font-weight:800;font-size:14px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--panel2);color:var(--text)}
.sw{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:14px;color:#fcd34d;cursor:pointer;white-space:nowrap}

/* الصفحة */
.wrap{max-width:1100px;margin:18px auto;padding:0 max(14px,env(safe-area-inset-right)) 0 max(14px,env(safe-area-inset-left))}
.hero{padding:20px;border:1px solid var(--line2);border-radius:24px;margin-bottom:14px;background:linear-gradient(135deg,#16295a,var(--panel) 72%);box-shadow:0 18px 50px #0006}
.hero h1{margin:0 0 4px;font-size:clamp(22px,4.4vw,32px);font-weight:900}
.hero p{margin:0 0 12px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.stat{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#0a1122aa;border:1px solid var(--line);font-size:13px}
.stat b{font-weight:800}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}
.card{background:linear-gradient(180deg,#101a31,var(--panel));border:1px solid var(--line);border-radius:var(--radius);padding:18px;margin-bottom:14px;box-shadow:0 10px 30px #0004;scroll-margin-top:calc(var(--hh) + 70px)}
.grid>.card{margin-bottom:0}
.card h2{margin:0 0 10px;font-size:18px;font-weight:900}
.card h3{font-weight:800}

/* الأزرار */
.btn{border:0;border-radius:14px;padding:11px 18px;min-height:44px;font:inherit;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--accent),#2563eb);display:inline-flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 8px 20px #2563eb44;transition:transform .12s,filter .12s}
.btn:hover{filter:brightness(1.1)}.btn:active{transform:scale(.97)}
.btn.good{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 8px 20px #05966944}
.btn.danger{background:linear-gradient(135deg,#f43f5e,#be123c);box-shadow:0 8px 20px #be123c44}
.btn.secondary{background:var(--panel2);box-shadow:none;border:1px solid var(--line2)}
.btn.sm{padding:6px 13px;min-height:36px;font-size:13px;border-radius:12px}
.btn:focus-visible,input:focus-visible,.selbtn:focus-visible,.shi:focus-visible,.tab:focus-visible{outline:2px solid var(--accent2);outline-offset:2px}
.card>.btn,.card>form>.btn{margin-top:4px}

/* الحقول */
input[type=text],input[type=password]{width:100%;min-height:46px;background:#0a1122;color:var(--text);border:1px solid var(--line);border-radius:14px;padding:10px 14px;margin:6px 0 12px;font:inherit;font-size:16px;-webkit-appearance:none;appearance:none;transition:border-color .15s,box-shadow .15s}
input[type=text]:focus,input[type=password]:focus{border-color:var(--accent);box-shadow:0 0 0 3px #4f8cff33;outline:0}
input::placeholder{color:#62729a}
input[type=checkbox]{-webkit-appearance:none;appearance:none;width:22px;height:22px;min-width:22px;border-radius:7px;border:2px solid var(--line2);background:#0a1122;display:inline-grid;place-content:center;cursor:pointer;margin:0;transition:.15s;flex:0 0 auto}
input[type=checkbox]:checked{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent}
input[type=checkbox]:checked::after{content:"";width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg) translate(-1px,-1px)}
.sw input[type=checkbox]{width:46px;height:27px;min-width:46px;border-radius:99px;position:relative;display:block;border-color:var(--line2)}
.sw input[type=checkbox]::after{content:"";position:absolute;top:2px;right:2px;left:auto;width:19px;height:19px;border:0;border-radius:50%;background:#8d9cc2;transform:none;transition:right .2s,background .2s}
.sw input[type=checkbox]:checked{background:#78350f66;border-color:var(--amber)}
.sw input[type=checkbox]:checked::after{right:21px;background:#fbbf24;border:0;width:19px;height:19px;transform:none}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:6px 0}
.row .sel{flex:1;min-width:180px}

/* القوائم المنسدلة (من تصميم الموقع) */
.nat{display:none!important}
.sel{position:relative;display:inline-block;min-width:190px;max-width:100%}
.sel.full{display:block;width:100%;margin:6px 0 12px}
.selbtn{width:100%;display:flex;align-items:center;gap:10px;text-align:start;min-height:46px;padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:#0a1122;color:var(--text);font:inherit;font-size:16px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.selbtn:hover{border-color:var(--line2)}
.selbtn .st{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.selbtn .sc{color:var(--accent2);font-size:14px}
.selbtn:disabled{opacity:.5;cursor:default}

/* النوافذ والقوائم المنبثقة */
.ovl{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;background:#02050cb8;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .18s}
.ovl.in{opacity:1}
.ovl.mid{align-items:center;padding:20px}
.sheet{width:100%;max-width:520px;max-height:78vh;max-height:78dvh;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line2);border-bottom:0;border-radius:26px 26px 0 0;transform:translateY(44px);transition:transform .24s cubic-bezier(.2,.9,.3,1);padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -20px 60px #000a}
.ovl.in .sheet{transform:none}
.shh{display:flex;align-items:center;gap:10px;padding:16px 18px 8px}
.shh b{flex:1;font-size:17px;font-weight:900}
.shx{border:0;background:var(--panel3);color:var(--text);width:34px;height:34px;border-radius:50%;font-size:15px;cursor:pointer}
input.shs{width:calc(100% - 28px);margin:6px 14px 8px}
.shl{overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:6px 10px 14px}
.shi{display:flex;align-items:center;gap:10px;width:100%;text-align:start;padding:13px 14px;border:0;background:transparent;color:var(--text);font:inherit;font-size:16px;border-radius:12px;cursor:pointer;overflow-wrap:anywhere}
.shi:hover{background:var(--panel3)}
.shi.on{background:#1d3566;font-weight:800}
.shi .ck{margin-inline-start:auto;color:var(--accent2)}
.dlg{width:min(100%,400px);text-align:center;background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line2);border-radius:26px;padding:24px 20px 18px;box-shadow:0 30px 80px #000c;transform:scale(.93) translateY(10px);transition:transform .22s cubic-bezier(.2,.9,.3,1)}
.ovl.in .dlg{transform:none}
.dlg.danger{border-color:#9f1d3f}
.dic{font-size:38px;line-height:1;margin-bottom:8px}
.dlg h3{margin:0 0 6px;font-size:19px;font-weight:900}
.dlg p{margin:0 0 16px;color:#c7d3f2;white-space:pre-line;overflow-wrap:anywhere}
.dbt{display:flex;gap:10px}
.dbt .btn{flex:1}
@media(min-width:700px){.ovl:not(.mid){align-items:center}.sheet{border-radius:24px;border-bottom:1px solid var(--line2);transform:scale(.96)}}

/* إشعارات */
#toasts{position:fixed;inset-inline:0;bottom:calc(16px + env(safe-area-inset-bottom));z-index:120;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 12px}
.toast{max-width:min(94vw,460px);padding:11px 16px;border-radius:14px;background:#111c36f5;border:1px solid var(--line2);box-shadow:0 14px 40px #000a;font-weight:700;font-size:14px;opacity:0;transform:translateY(14px);transition:opacity .25s,transform .25s}
.toast.in{opacity:1;transform:none}
.toast.ok{border-color:#10805b}.toast.warn{border-color:#92661a}.toast.error{border-color:#9f1d3f}

/* الرتب والنسخ */
.roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;max-height:420px;overflow:auto;padding:10px 0;-webkit-overflow-scrolling:touch}
.role{display:flex;align-items:center;gap:10px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px;min-width:0;transition:border-color .15s}
.role:hover{border-color:var(--line2)}
.role label{overflow-wrap:anywhere;cursor:pointer;flex:1;font-weight:600;color:var(--text)}
.role small{color:var(--muted)}
.alert{padding:12px 14px;border-radius:14px;margin:10px 0;background:#18264a;border:1px solid var(--line);overflow-wrap:anywhere}
.alert.error{background:#3b1220;border-color:#9f1d3f}
.alert.ok{background:#0b2f25;border-color:#10805b}
.alert.warn{background:#3a2a0b;border-color:#92661a}
.backup{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding:14px 0}
.backup:last-child{border-bottom:0}
.login{max-width:400px;margin:12vh auto}
.login .lk{font-size:40px;text-align:center;margin-bottom:4px}
.login h2{text-align:center}
.footer{padding:20px;text-align:center;color:var(--muted);font-size:12px}
.restore{flex-basis:100%}
.restore>summary{list-style:none;cursor:pointer;display:inline-flex}
.restore>summary::-webkit-details-marker{display:none}
.rpanel{margin-top:14px;border:1px solid var(--line);border-radius:16px;padding:14px;background:#0a1122}
.rcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:12px}
.rcols h3{margin:0 0 8px;font-size:15px}
.picklist,.preview{max-height:340px;overflow:auto;border:1px solid var(--line);border-radius:14px;padding:8px;background:var(--panel);-webkit-overflow-scrolling:touch}
.pick{display:flex;align-items:center;gap:10px;padding:7px 4px;overflow-wrap:anywhere;font-weight:600;color:var(--text)}
.prow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);margin:3px 0;overflow-wrap:anywhere}
.prow.locked{opacity:.45}
.prow small{margin-inline-start:auto;color:var(--muted)}
.gap{display:block;width:100%;border:1px dashed var(--line2);background:transparent;color:var(--muted);border-radius:8px;padding:5px;font:inherit;font-size:12px;cursor:pointer;margin:2px 0;opacity:.6}
.gap:hover{opacity:1;border-color:var(--accent2);color:var(--accent2)}
.newblock{border:2px solid var(--green);background:#0b2f25;border-radius:12px;padding:6px;margin:4px 0}
.chip{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:#10805b33;margin:3px 0;overflow-wrap:anywhere}
.chip em{margin-inline-start:auto;font-style:normal;font-size:11px;background:var(--green);color:#fff;border-radius:6px;padding:1px 6px}
.where{margin:8px 0 0;font-size:14px}
.log{max-height:300px;overflow:auto;background:#0a1122;border:1px solid var(--line);border-radius:14px;padding:10px;margin:10px 0;font-size:14px;-webkit-overflow-scrolling:touch}
.ln{padding:3px 0;overflow-wrap:anywhere}
.ln.ok{color:#6ee7b7}.ln.error{color:#fda4af}.ln.warn{color:#fcd34d}.ln.info{color:var(--muted)}
.busy .btn:not(#pclose):not(.dbtn){pointer-events:none;opacity:.55}

/* التبويبات */
.tabs{display:flex;gap:6px;overflow-x:auto;padding:6px 0 12px;position:sticky;top:var(--hh);z-index:4;background:linear-gradient(var(--bg) 78%,transparent);scrollbar-width:none;-webkit-overflow-scrolling:touch}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:0 0 auto;border:1px solid var(--line);background:var(--panel2);color:var(--text);padding:10px 17px;min-height:42px;border-radius:999px;font:inherit;font-weight:800;cursor:pointer;white-space:nowrap;transition:.15s}
.tab:hover{border-color:var(--line2)}
.tab.on{background:linear-gradient(135deg,var(--accent),#2563eb);border-color:transparent;box-shadow:0 8px 20px #2563eb44}
.tab.red.on{background:linear-gradient(135deg,#f43f5e,#be123c);box-shadow:0 8px 20px #be123c44}
.top{flex:1;min-width:0}
.top input{margin:0}

/* الصلاحيات */
.gh{margin:16px 0 6px;padding-bottom:6px;border-bottom:1px solid var(--line);color:var(--accent2);font-size:16px}
.prm{display:flex;gap:12px;align-items:flex-start;padding:11px;border:1px solid var(--line);border-radius:14px;background:var(--panel2);margin:6px 0}
.prm input{margin-top:3px}
.prm.dng{border-color:#9f1d3f;background:#2a1020}
.pt b{font-size:16px}
.pt small.en{display:block;color:var(--muted);direction:ltr;text-align:right;font-size:12px}
.pt .muted{font-size:13px;margin-top:3px}
.wb{display:inline-block;margin-inline-start:8px;background:var(--red);color:#fff;border-radius:8px;padding:1px 8px;font-size:12px;font-weight:800}
.res{display:flex;gap:8px;padding:7px 4px;border-bottom:1px solid var(--line)}
.res .w{flex:1}.res small{display:block;color:var(--muted)}
.pr{padding:10px 13px;border-radius:12px;margin:5px 0;border:1px solid var(--line)}
.pr.danger{background:#3b1220;border-color:#9f1d3f}.pr.warn{background:#3a2a0b;border-color:#92661a}.pr.info{background:#18264a}.pr.ok{background:#0b2f25;border-color:#10805b}
.ch{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);margin:3px 0;overflow-wrap:anywhere}
.ch.sub{margin-inline-start:22px}
.ch.cat{background:#1b2a52;font-weight:800}
.dr{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);margin:3px 0;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.dr.sub{margin-inline-start:24px}.dr.cat{background:#1b2a52;font-weight:800}
.dr.drag{opacity:.55;border-color:var(--accent2)}
.hd{cursor:grab;touch-action:none;padding:4px 10px;font-size:20px;color:var(--accent2)}
.lockbox{border:2px solid var(--red);background:linear-gradient(180deg,#2a0d18,#1a0a14)}
.lockbox.on{animation:pulse 1.6s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 6px #e11d4833}}
.hist{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 0;border-bottom:1px solid var(--line)}
.hist:last-child{border-bottom:0}
/* طلبات البوتات */
.bq{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--panel2);margin:10px 0}
.bq.pend{border-color:#92661a;background:linear-gradient(180deg,#2a2210,var(--panel2))}
.bq-top{display:flex;align-items:center;gap:12px;min-width:0}
.bq-av{width:58px;height:58px;border-radius:50%;object-fit:cover;background:var(--panel3);flex:0 0 auto;display:grid;place-items:center;font-size:26px;border:2px solid var(--line2)}
.bq-av.sm{width:34px;height:34px;font-size:16px;border-width:1px}
.bq-nm{min-width:0;flex:1;overflow-wrap:anywhere}
.bq-nm b{font-size:17px}
.bq-nm small{display:block;color:var(--muted);direction:ltr;text-align:right;font-size:12px}
.bq-meta{display:flex;gap:10px 22px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:14px}
.bq-by{display:inline-flex;align-items:center;gap:8px;color:var(--text);font-weight:700;min-width:0}
.bq-act{display:flex;gap:8px;flex-wrap:wrap}
.bq-act .btn{flex:1;min-width:130px}
.chip{display:inline-block;padding:2px 11px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid var(--line);white-space:nowrap}
.chip.ok{background:#0b2f25;border-color:#10805b;color:#6ee7b7}
.chip.no{background:#3b1220;border-color:#9f1d3f;color:#fda4af}
.chip.wait{background:#3a2a0b;border-color:#92661a;color:#fcd34d}
.chip.gray{background:var(--panel3);color:var(--muted)}
.tbadge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;margin-inline-start:6px;border-radius:99px;background:var(--red);color:#fff;font-size:12px;font-weight:900}
/* محرر صلاحيات الروم */
.seg{display:flex;gap:4px;flex:0 0 auto;background:#0a1122;border:1px solid var(--line);border-radius:12px;padding:3px}
.sg{border:0;background:transparent;color:var(--muted);min-width:40px;min-height:38px;border-radius:9px;font:inherit;font-size:15px;cursor:pointer}
.sg.on{background:var(--panel3);color:var(--text)}
.sg.on[data-v=allow]{background:#10805b66}.sg.on[data-v=deny]{background:#9f1d3f77}.sg.on[data-v=neutral]{background:#92661a66}
.pe .pt{flex:1;min-width:0}
.pe.chg{border-color:var(--accent2)}
.tgt{padding:10px 14px;border-radius:12px;background:#0a1122;border:1px dashed var(--line2);margin:8px 0;font-weight:700}
@media(max-width:520px){.pe{flex-wrap:wrap}.pe .seg{width:100%}.pe .sg{flex:1}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(max-width:520px){.card{padding:15px}.hero{padding:16px}.btn{padding:11px 15px}}
`;

const layout = (title, body, loggedIn) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#050912">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="format-detection" content="telephone=no">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header>
  <div class="hrow">
    <div class="brand"><span class="logo">🛡️</span><span>ROLE <b>VAULT</b></span></div>
    <div class="sp"></div>
    ${loggedIn ? `<span class="live off" id="live" title="التحديث الفوري"><i></i><span id="liveTx">جاري الاتصال…</span></span>
    <a class="exit" href="/logout">خروج</a>` : ""}
  </div>
  ${loggedIn ? `<div class="hrow r2">
    <div class="top"><input type="text" id="q" placeholder="🔍 بحث سريع عن رتبة أو روم…" autocomplete="off" enterkeyhint="search"></div>
    <label class="sw"><input type="checkbox" id="dry"><span>معاينة</span></label>
  </div>` : ""}
</header>
<main class="wrap">${body}</main>
<div class="footer">لا تشارك رابط لوحة التحكم أو كلمة السر</div>
<div id="toasts" aria-live="polite"></div>
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
    <div class="lk">🔐</div>
    <h2>الدخول للوحة</h2>
    <p class="muted" style="text-align:center">اكتب كلمة السر للمتابعة.</p>
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
var S=null,M=null,busy=false,fbusy=null,chosen={},chCh={},sig={},loading=false,again=false,loadP=null;
var ordDirty=false,setDirty=false,permForce=false,bkPending=false,wasDown=false,es=null,curTab='roles',ct=null,lastD=null;
var CID=Math.random().toString(36).slice(2,10)+Date.now().toString(36);
var TABS=['roles','perms','chans','check','bots','safe'];
var lastP=null;
var DRY_OK={'/api/delete':1,'/api/restore':1,'/api/role-perms':1,'/api/copy-role':1,'/api/copy-channel':1,'/api/bulk':1,'/api/template':1,'/api/lockdown':1,'/api/reorder':1};
function $(i){return document.getElementById(i)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function dot(c){var s=el('span',null,'●');s.style.color=(c&&c!=='#000000')?c:'#8c9bbf';return s}
function h(o){return JSON.stringify(o)}
function val(id){return $(id).value}
function icon(t){return t===4?'📁':(t===2||t===13)?'🔊':'#'}
function api(path,method,body,title){
  var hd={'content-type':'application/json','x-cid':CID};if(title)hd['x-job-title']=encodeURIComponent(title);
  return fetch(path,{method:method||'GET',credentials:'same-origin',headers:hd,body:body?JSON.stringify(body):undefined})
  .then(function(r){if(r.status===401){setTimeout(function(){location.href='/login'},600)}
    return r.json().catch(function(){return {}}).then(function(j){if(!r.ok||j.error)throw new Error(j.error||('خطأ '+r.status));return j;});});
}
function showMsg(t,type){var m=$('msg');m.textContent='';if(t)m.appendChild(el('div','alert '+(type||'error'),t))}

/* ===== إشعارات صغيرة ===== */
function toast(msg,type,ms){
  var box=$('toasts'),t=el('div','toast '+(type||'info'),msg);box.appendChild(t);
  requestAnimationFrame(function(){t.classList.add('in')});
  setTimeout(function(){t.classList.remove('in');setTimeout(function(){t.remove()},300)},ms||3200);
  while(box.children.length>3)box.firstChild.remove();
}
function notify(msg){toast(msg,'warn')}

/* ===== نوافذ الموقع (بدل نوافذ الآيفون) ===== */
var lk=0;
function lock(){if(!lk++)document.documentElement.classList.add('nosc')}
function unlock(){if(lk>0&&!--lk)document.documentElement.classList.remove('nosc')}
function dialog(o){
  return new Promise(function(resolve){
    var prev=document.activeElement,done=false;
    var ov=el('div','ovl mid'),d=el('div','dlg'+(o.danger?' danger':''));
    d.setAttribute('role','alertdialog');d.setAttribute('aria-modal','true');
    d.appendChild(el('div','dic',o.icon||(o.danger?'⚠️':'💬')));
    d.appendChild(el('h3',null,o.title||'تنبيه'));
    if(o.msg)d.appendChild(el('p',null,o.msg));
    var row=el('div','dbt'),ok=el('button','btn dbtn'+(o.danger?' danger':' good'),o.ok||'حسناً'),no=null;ok.type='button';
    if(o.cancel){no=el('button','btn secondary dbtn',o.cancel);no.type='button';row.appendChild(no)}
    row.appendChild(ok);d.appendChild(row);ov.appendChild(d);document.body.appendChild(ov);lock();
    function close(v){
      if(done)return;done=true;document.removeEventListener('keydown',key,true);ov.classList.remove('in');
      setTimeout(function(){ov.remove();unlock();try{if(prev&&prev.focus)prev.focus()}catch(e){}},180);resolve(v);
    }
    function key(e){if(e.key==='Escape'){e.stopPropagation();close(false)}}
    ok.addEventListener('click',function(){close(true)});
    if(no)no.addEventListener('click',function(){close(false)});
    ov.addEventListener('click',function(e){if(e.target===ov&&o.cancel)close(false)});
    document.addEventListener('keydown',key,true);
    requestAnimationFrame(function(){ov.classList.add('in');(o.danger&&no?no:ok).focus()});
  });
}
function ask(msg,o){o=o||{};return dialog({title:o.title||'تأكيد',msg:msg,ok:o.ok||'تأكيد',cancel:'إلغاء',danger:!!o.danger,icon:o.icon})}
function maybe(msg,o){return $('dry').checked?Promise.resolve(true):ask(msg,o)}

/* ===== قوائم منسدلة من تصميم الموقع ===== */
function refreshSel(s){
  if(!s._tx)return;var o=s.options[s.selectedIndex];
  s._tx.textContent=o?o.textContent:'— لا يوجد —';s._btn.disabled=!s.options.length;
}
function enhance(s){
  if(s._tx)return;
  var w=el('div','sel'+(s.classList.contains('full')?' full':''));
  s.parentNode.insertBefore(w,s);w.appendChild(s);s.classList.add('nat');s.tabIndex=-1;s.setAttribute('aria-hidden','true');
  var b=el('button','selbtn');b.type='button';b.setAttribute('aria-haspopup','listbox');
  var tx=el('span','st');b.appendChild(tx);b.appendChild(el('span','sc','▼'));w.appendChild(b);
  s._btn=b;s._tx=tx;b.addEventListener('click',function(){openSheet(s)});refreshSel(s);
}
function openSheet(s){
  var title=s.getAttribute('data-t')||'اختر';
  var ov=el('div','ovl'),sh=el('div','sheet'),hd=el('div','shh'),done=false;
  sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label',title);
  hd.appendChild(el('b',null,title));
  var x=el('button','shx','✕');x.type='button';x.setAttribute('aria-label','إغلاق');hd.appendChild(x);sh.appendChild(hd);
  var opts=[].slice.call(s.options),inp=null,items=[];
  if(opts.length>7){
    inp=document.createElement('input');inp.type='text';inp.className='shs';inp.placeholder='🔍 ابحث…';inp.setAttribute('autocomplete','off');sh.appendChild(inp);
  }
  var list=el('div','shl');list.setAttribute('role','listbox');sh.appendChild(list);
  function close(){
    if(done)return;done=true;document.removeEventListener('keydown',key,true);ov.classList.remove('in');
    setTimeout(function(){ov.remove();unlock();try{s._btn.focus()}catch(e){}},200);
  }
  function key(e){if(e.key==='Escape'){e.stopPropagation();close()}}
  opts.forEach(function(o){
    var on=o.value===s.value,b=el('button','shi'+(on?' on':''));b.type='button';b.setAttribute('role','option');
    b.appendChild(el('span',null,o.textContent));if(on)b.appendChild(el('span','ck','✓'));
    b.addEventListener('click',function(){var chg=s.value!==o.value;s.value=o.value;refreshSel(s);close();if(chg)s.dispatchEvent(new Event('change',{bubbles:true}))});
    list.appendChild(b);items.push({b:b,t:o.textContent.toLowerCase(),on:on});
  });
  if(!opts.length)list.appendChild(el('p','muted','ما فيه خيارات.'));
  if(inp)inp.addEventListener('input',function(){var q=inp.value.trim().toLowerCase();items.forEach(function(i){i.b.hidden=!!q&&i.t.indexOf(q)<0})});
  x.addEventListener('click',close);ov.addEventListener('click',function(e){if(e.target===ov)close()});
  ov.appendChild(sh);document.body.appendChild(ov);lock();document.addEventListener('keydown',key,true);
  requestAnimationFrame(function(){
    ov.classList.add('in');
    var cur=items.filter(function(i){return i.on})[0];if(cur)cur.b.scrollIntoView({block:'center'});
    if(inp&&window.matchMedia&&matchMedia('(pointer:fine)').matches)inp.focus();
  });
}

/* ===== التقدم المباشر ===== */
var ICON={ok:'✅',error:'❌',warn:'⚠️',info:'ℹ️'};
function logLine(type,msg){var l=$('plog');l.appendChild(el('div','ln '+type,(ICON[type]||'•')+' '+msg));l.scrollTop=l.scrollHeight}
function openProgress(title,quiet){var p=$('progress');p.hidden=false;$('ptitle').textContent=title;$('plog').textContent='';$('pclose').hidden=true;if(!quiet)p.scrollIntoView({behavior:'smooth',block:'start'})}
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
  if((busy||fbusy)&&!free){notify('فيه عملية شغالة الحين، انتظر تخلص.');return}
  body=body||{};if(DRY_OK[path]&&$('dry').checked)body.dry=true;
  var full=title+(body.dry?' (معاينة)':'');
  busy=true;document.body.classList.add('busy');openProgress(full);
  api(path,'POST',body,full).then(function(j){return poll(j.jobId)})
  .catch(function(e){logLine('error',e.message)})
  .then(function(){busy=false;document.body.classList.remove('busy');$('pclose').hidden=false;return load()});
}
/* عملية بدأها جهاز ثاني: نتابعها مباشرة */
function attach(d){
  if(!d||!d.jobId||busy||fbusy)return;
  fbusy=d.jobId;document.body.classList.add('busy');
  openProgress((d.title||'عملية')+' — من جهاز ثاني',true);toast('⏳ عملية شغالة من جهاز ثاني: '+(d.title||''),'info',3600);
  poll(d.jobId).then(function(){fbusy=null;document.body.classList.remove('busy');$('pclose').hidden=false;return load()});
}

/* ===== التبويبات + البحث ===== */
function tab(name){
  curTab=name;
  TABS.forEach(function(t){$('t-'+t).hidden=(t!==name);$('b-'+t).classList.toggle('on',t===name)});
  try{history.replaceState(null,'','#'+name)}catch(e){}
  if(name==='safe'){loadHistory();loadSync()}
  if(name==='bots')loadBots();
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
  var box=$('roles'),st=box.scrollTop;box.textContent='';var ids={};
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
  box.scrollTop=st;updCount();
}
function renderGuilds(){
  var s=$('guildSel');s.textContent='';
  S.guilds.forEach(function(g){var o=el('option',null,g.name);o.value=g.id;if(g.id===S.guildId)o.selected=true;s.appendChild(o)});
  s.value=S.guildId;refreshSel(s);
}
function renderStats(){
  var b=$('stats');b.textContent='';
  [['🏷️',S.roles.length+' رتبة'],['💬',S.channels.length+' روم وتصنيف'],['💾',S.backups.length+' نسخة'],[S.lock.active?'🔴':'🟢',S.lock.active?'السيرفر مقفل':'السيرفر مفتوح']].forEach(function(x){
    var c=el('span','stat');c.appendChild(el('span',null,x[0]));c.appendChild(el('b',null,x[1]));b.appendChild(c);
  });
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
  det.appendChild(el('summary','btn good','♻️ استعادة… (اختيار الأجزاء والمكان)'));
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
    if(sel<0||(!ch.length&&!(withCh&&pc.length))){notify('حدد شي من النسخة ومكانه.');return}
    maybe('استعادة '+ch.length+' رتبة'+(withCh?' و'+pc.length+' روم':'')+'\n'+gaps[sel].label,{title:'تأكيد الاستعادة',ok:'استعِد الآن',icon:'♻️'}).then(function(ok){
      if(ok)runJob('الاستعادة','/api/restore',{backupId:b.id,anchorId:gaps[sel].anchorId,mode:gaps[sel].mode,pick:ch.map(function(r){return r.i}),withChannels:withCh,pickCh:pc});
    });
  });
  render();return det;
}
function renderBackups(){
  if(document.querySelector('#backups details.restore[open]')){bkPending=true;return}
  bkPending=false;
  var box=$('backups');box.textContent='';
  if(!S.backups.length){box.appendChild(el('p','muted','ما فيه نسخ محفوظة. اضغط «نسخ الآن».'));return}
  S.backups.forEach(function(b){
    var row=el('div','backup');
    var info=el('div');info.appendChild(el('b',null,(b.auto?'🕒 ':'')+(b.label||'نسخة')));
    info.appendChild(el('div','muted',new Date(b.createdAt).toLocaleString('ar-SA')+' · '+b.count+' رتبة'+(b.chans.length?' · '+b.chans.length+' روم':'')+(b.fromGuild?' · من: '+b.fromGuild:'')));
    var del=el('button','btn secondary','🗑️ حذف النسخة');del.type='button';
    del.addEventListener('click',function(){
      ask('حذف النسخة الاحتياطية فقط؟ (الرتب والرومات في السيرفر ما تتأثر)',{title:'حذف النسخة',ok:'حذف',danger:true,icon:'🗑️'}).then(function(ok){
        if(ok)api('/api/backup/delete','POST',{backupId:b.id},'حذف نسخة احتياطية').then(function(){toast('تم حذف النسخة','ok');return load()}).catch(function(e){showMsg(e.message)});
      });
    });
    row.appendChild(info);row.appendChild(del);row.appendChild(restorePanel(b));box.appendChild(row);
  });
}

/* ===== القوائم المنسدلة ===== */
function fillSel(id,arr,v,l,first){
  var s=$(id);if(!s)return;var old=s.value;s.textContent='';
  if(first){var o=el('option',null,first[1]);o.value=first[0];s.appendChild(o)}
  arr.forEach(function(x){var o=el('option',null,l(x));o.value=v(x);s.appendChild(o)});
  if(old)s.value=old;refreshSel(s);
}
function fillAll(){
  var rv=function(r){return r.id},rl=function(r){return r.name},cv=function(c){return c.id},cl=function(c){return icon(c.type)+' '+c.name};
  ['pr','cmpB','cpTo','tpRole'].forEach(function(i){fillSel(i,S.roles,rv,rl)});
  fillSel('bkT',S.roles,rv,rl,[S.guildId,'@everyone (الكل)']);
  fillSel('peRole',S.roles,rv,rl,[S.guildId,'@everyone (الكل)']);
  fillSel('peCh',S.channels,cv,cl);peUpd();
  var nc=S.channels.filter(function(c){return c.type!==4});
  ['ccA','ccB','efCh'].forEach(function(i){fillSel(i,nc,cv,cl)});
  fillSel('tpCat',S.channels.filter(function(c){return c.type===4}),cv,cl,['','بدون تصنيف']);
}

/* ===== الصلاحيات ===== */
var ZERO=BigInt(0);
function permDirty(){
  var b=$('permBox').querySelectorAll('input[type=checkbox]');
  for(var i=0;i<b.length;i++)if((b[i].checked?'1':'0')!==b[i].dataset.o)return true;
  return false;
}
function renderPerm(force){
  if(!M||!S)return;
  if(!force&&!permForce&&permDirty()){$('permNote').hidden=false;return}
  permForce=false;$('permNote').hidden=true;
  var box=$('permBox');box.textContent='';
  var r=S.roles.filter(function(x){return x.id===val('pr')})[0];if(!r)return;
  var cur=BigInt(r.perms);
  ['m','c','v','a'].forEach(function(g){
    box.appendChild(el('h3','gh',M.groups[g]));
    M.perms.filter(function(p){return p.g===g}).forEach(function(p){
      var row=el('div','prm srch'+(p.danger?' dng':'')),cb=document.createElement('input');
      cb.type='checkbox';cb.dataset.k=p.k;cb.dataset.d=p.danger?'1':'';cb.checked=(cur&BigInt(p.bit))!==ZERO;cb.dataset.o=cb.checked?'1':'0';
      var t=el('div','pt'),hh=el('b',null,p.ar);
      if(p.danger)hh.appendChild(el('span','wb','⚠️ خطيرة'));
      t.appendChild(hh);t.appendChild(el('small','en',p.en));t.appendChild(el('div','muted',p.d));
      row.appendChild(cb);row.appendChild(t);box.appendChild(row);
    });
  });
}
function savePerms(){
  var set={},dng=[],boxes=$('permBox').querySelectorAll('input[type=checkbox]');
  for(var i=0;i<boxes.length;i++){var b=boxes[i];if((b.checked?'1':'0')!==b.dataset.o){set[b.dataset.k]=b.checked;if(b.checked&&b.dataset.d)dng.push(b.dataset.k)}}
  if(!Object.keys(set).length){notify('ما غيّرت شي.');return}
  function go(){permForce=true;runJob('تعديل الصلاحيات','/api/role-perms',{roleId:val('pr'),set:set})}
  if(dng.length&&!$('dry').checked)ask('أنت على وشك إعطاء صلاحيات خطيرة:\n'+dng.map(function(k){return '• '+permName(k).ar}).join('\n')+'\n\nمتأكد؟',{title:'صلاحيات خطيرة',ok:'نعم، طبّق',danger:true,icon:'⚠️'}).then(function(ok){if(ok)go()});
  else go();
}
function permName(k){var p=M.perms.filter(function(x){return x.k===k})[0];return p?p:{ar:k,en:''}}

/* ===== الرومات ===== */
function renderChans(){
  var box=$('chList');box.textContent='';
  S.channels.forEach(function(c){
    var row=el('div','ch srch'+(c.type===4?' cat':(c.parentId?' sub':'')));
    var cb=document.createElement('input');cb.type='checkbox';cb.checked=!!chCh[c.id];
    cb.addEventListener('change',function(){chCh[c.id]=cb.checked;chCnt()});
    row.appendChild(cb);row.appendChild(el('span',null,icon(c.type)+' '+c.name));box.appendChild(row);
  });
  chCnt();
  if(!sig.bkP){fillSel('bkP',M.perms,function(p){return p.k},function(p){return p.ar+' — '+p.en});buildPE();sig.bkP=1}
}
function chCnt(){var n=0;for(var k in chCh)if(chCh[k])n++;$('chCount').textContent=n+' محدد';peUpd()}
/* ===== محرر صلاحيات الروم ===== */
function peIds(){var c=Object.keys(chCh).filter(function(k){return chCh[k]});return c.length?c:(val('peCh')?[val('peCh')]:[])}
function selText(id){var s=$(id),o=s.options[s.selectedIndex];return o?o.textContent:''}
function peUpd(){
  var n=Object.keys(chCh).filter(function(k){return chCh[k]}).length,t=$('peTgt');if(!t)return;
  t.textContent=n?('🎯 الهدف: '+n+' روم محدد من القائمة تحت'):('🎯 الهدف: '+(selText('peCh')||'—'));
}
function buildPE(){
  var box=$('peBox');box.textContent='';
  ['m','c','v'].forEach(function(g){
    box.appendChild(el('h3','gh',M.groups[g]));
    M.perms.filter(function(p){return p.g===g}).forEach(function(p){
      var row=el('div','prm pe srch'+(p.danger?' dng':''));row.dataset.k=p.k;row.dataset.v='';
      var t=el('div','pt'),hh=el('b',null,p.ar);if(p.danger)hh.appendChild(el('span','wb','⚠️ خطيرة'));
      t.appendChild(hh);t.appendChild(el('small','en',p.en));
      var sg=el('div','seg');
      [['','—','بدون تغيير'],['allow','✅','سماح'],['deny','❌','منع'],['neutral','↺','إلغاء التخصيص']].forEach(function(o){
        var b=el('button','sg'+(o[0]===''?' on':''),o[1]);b.type='button';b.title=o[2];b.setAttribute('aria-label',o[2]);b.dataset.v=o[0];
        b.addEventListener('click',function(){row.dataset.v=o[0];row.classList.toggle('chg',!!o[0]);[].forEach.call(sg.children,function(x){x.classList.toggle('on',x===b)})});
        sg.appendChild(b);
      });
      row.appendChild(t);row.appendChild(sg);box.appendChild(row);
    });
  });
}
function peReset(){
  [].forEach.call($('peBox').querySelectorAll('.pe'),function(r){r.dataset.v='';r.classList.remove('chg');[].forEach.call(r.querySelectorAll('.sg'),function(b){b.classList.toggle('on',b.dataset.v==='')})});
}
/* سلسلة عمليات متتابعة في لوحة تقدم وحدة */
function runChain(title,steps,after){
  if(busy||fbusy){notify('فيه عملية شغالة الحين، انتظر تخلص.');return}
  var dry=$('dry').checked,i=0,full=title+(dry?' (معاينة)':'');
  busy=true;document.body.classList.add('busy');openProgress(full);
  function fin(){busy=false;document.body.classList.remove('busy');$('pclose').hidden=false;if(after)after();return load()}
  (function next(){
    if(i>=steps.length)return fin();
    var st=steps[i++],b=st.body;if(dry)b.dry=true;
    logLine('info','('+i+'/'+steps.length+') '+st.label);
    api(st.path,'POST',b,full).then(function(j){return poll(j.jobId)}).then(next).catch(function(e){logLine('error',e.message);fin()});
  })();
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
function renderOrder(force){
  if(!force&&ordDirty){$('ordNote').hidden=false;return}
  ordDirty=false;$('ordNote').hidden=true;
  var box=$('ordList');box.textContent='';
  S.channels.forEach(function(c){
    var row=el('div','dr srch'+(c.type===4?' cat':''));row.dataset.id=c.id;row.dataset.t=String(c.type);row.dataset.p=c.parentId||'';
    if(c.parentId)row.classList.add('sub');
    var hd=el('span','hd','☰');row.appendChild(hd);row.appendChild(el('span',null,icon(c.type)+' '+c.name));
    hd.addEventListener('pointerdown',function(ev){
      ev.preventDefault();hd.setPointerCapture(ev.pointerId);
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
        norm();ordDirty=true;
      }
      function up(){hd.removeEventListener('pointermove',mv);hd.removeEventListener('pointerup',up);hd.removeEventListener('pointercancel',up);items.forEach(function(x){x.classList.remove('drag')})}
      hd.addEventListener('pointermove',mv);hd.addEventListener('pointerup',up);hd.addEventListener('pointercancel',up);
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
  ordDirty=false;runJob('حفظ ترتيب الرومات','/api/reorder',{items:items});
}

/* ===== النتائج (معاينة / مقارنة / مشاكل) ===== */
function out(title){var o=$('out');o.hidden=false;$('otitle').textContent=title;$('obody').textContent='';o.scrollIntoView({behavior:'smooth',block:'start'});return $('obody')}
function resRow(ok,p,why){
  var r=el('div','res'),w=el('div','w'),hh=el('b',null,p.ar||p);
  w.appendChild(hh);if(p.en)w.appendChild(el('small',null,p.en));if(why)w.appendChild(el('small',null,why));
  r.appendChild(el('span',null,ok?'✅':'❌'));r.appendChild(w);return r;
}
function doEffective(){
  var q=val('efQ').trim();if(!q){notify('اكتب اسم العضو أو الآيدي.');return}
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
  if(setDirty)return;
  var ex=$('exempt'),st=ex.scrollTop;ex.textContent='';
  S.roles.forEach(function(r){
    var l=el('label','pick srch'),cb=document.createElement('input');cb.type='checkbox';cb.value=r.id;cb.checked=S.settings.exempt.indexOf(r.id)>=0;
    l.appendChild(cb);l.appendChild(dot(r.color));l.appendChild(el('span',null,r.name));ex.appendChild(l);
  });
  ex.scrollTop=st;$('autoBk').checked=S.settings.auto;
}
function loadHistory(){
  api('/api/history').then(function(j){
    var box=$('hist');box.textContent='';
    if(!j.list.length)box.appendChild(el('p','muted','ما فيه عمليات بعد.'));
    j.list.forEach(function(x){
      var r=el('div','hist'),i=el('div');i.appendChild(el('b',null,x.action));
      i.appendChild(el('div','muted',new Date(x.at).toLocaleString('ar-SA')+' · بواسطة: '+decodeURIComponentSafe(x.actor)));
      r.appendChild(i);
      if(x.undoable){var u=el('button','btn secondary sm','↩️ تراجع');u.type='button';u.addEventListener('click',function(){
        ask('التراجع عن «'+x.action+'»؟',{title:'تراجع',ok:'تراجع',icon:'↩️'}).then(function(ok){if(ok)runJob('تراجع','/api/undo',{id:x.id})});
      });r.appendChild(u)}
      box.appendChild(r);
    });
  }).catch(function(e){showMsg(e.message)});
}
/* ===== طلبات البوتات ===== */
function safeImg(u){return typeof u==='string'&&u.indexOf('https://cdn.discordapp.com/')===0}
function avatar(url,cls,fb){
  if(safeImg(url)){var i=document.createElement('img');i.className=cls;i.src=url;i.alt='';i.loading='lazy';i.referrerPolicy='no-referrer';return i}
  return el('span',cls,fb)
}
function fmtDate(d){return d?new Date(d).toLocaleString('ar-SA'):''}
function setBotBadge(n){var b=$('botBadge');b.textContent=n;b.hidden=!n}
function botCard(x,pending){
  var c=el('div','bq'+(pending?' pend':'')),top=el('div','bq-top');
  top.appendChild(avatar(x.botAvatar,'bq-av','🤖'));
  var nm=el('div','bq-nm');nm.appendChild(el('b',null,x.botName||x.botTag));nm.appendChild(el('small',null,'@'+(x.botTag||'')+' · '+x.botId));
  top.appendChild(nm);
  var st={pending:['wait','⏳ بانتظار القرار'],working:['wait','⏳ جاري التنفيذ'],approved:['ok','✅ مقبول'],rejected:['no','⛔ مرفوض'],left:['gray','طلع قبل القرار']}[x.status]||['gray',x.status];
  top.appendChild(el('span','chip '+st[0],st[1]));c.appendChild(top);
  var meta=el('div','bq-meta'),by=el('span','bq-by');
  by.appendChild(el('span','muted','أضافه:'));
  if(x.addedById||x.addedByName){by.appendChild(avatar(x.addedByAvatar,'bq-av sm','👤'));by.appendChild(el('span',null,x.addedByName||x.addedById))}
  else by.appendChild(el('span','muted','غير معروف (يحتاج صلاحية «عرض سجل السيرفر» للبوت)'));
  meta.appendChild(by);
  meta.appendChild(el('span',null,'📅 '+fmtDate(x.createdAt)));
  if(!pending&&x.decidedAt)meta.appendChild(el('span',null,'🕓 '+fmtDate(x.decidedAt)+(x.decidedBy?' · '+x.decidedBy:'')));
  c.appendChild(meta);
  if(x.danger&&x.danger.length)c.appendChild(el('div','alert error','⚠️ يطلب صلاحيات خطيرة: '+x.danger.join('، ')));
  if(pending&&!x.frozen)c.appendChild(el('div','alert warn','⚠️ '+(x.note||'ما تجمّدت صلاحياته')+' — البوت شغّال بصلاحياته الحالية لين تقرر.'));
  if(pending&&x.status==='pending'){
    var act=el('div','bq-act'),ok=el('button','btn good','✅ قبول'),no=el('button','btn danger','⛔ رفض وطرد');
    ok.type='button';no.type='button';
    ok.addEventListener('click',function(){decideBot(x,'approve')});
    no.addEventListener('click',function(){decideBot(x,'reject')});
    act.appendChild(ok);act.appendChild(no);c.appendChild(act);
  }
  return c;
}
function renderBots(j){
  var p=$('botPend'),d=$('botDone');p.textContent='';d.textContent='';
  if(!j.pending.length)p.appendChild(el('p','muted','ما فيه طلبات معلّقة 👌'));
  j.pending.forEach(function(x){p.appendChild(botCard(x,true))});
  if(!j.done.length)d.appendChild(el('p','muted','ما فيه قرارات سابقة.'));
  j.done.forEach(function(x){d.appendChild(botCard(x,false))});
  setBotBadge(j.pending.length);
}
function loadBots(){
  return api('/api/bot-requests').then(renderBots).catch(function(e){showMsg(e.message)});
}
function decideBot(x,action){
  var yes=action==='approve';
  ask(yes?('قبول البوت «'+(x.botName||x.botTag)+'»؟ ترجع له صلاحياته ويكمل في السيرفر.'):('رفض البوت «'+(x.botName||x.botTag)+'»؟ ينطرد من السيرفر.'),
    {title:yes?'قبول بوت':'رفض بوت',ok:yes?'قبول':'رفض وطرد',danger:!yes,icon:yes?'✅':'⛔'}).then(function(ok){
    if(!ok)return;
    api('/api/bot-requests/decide','POST',{id:x.id,action:action},yes?'قبول بوت':'رفض بوت')
      .then(function(){toast(yes?'✅ تم قبول البوت':'⛔ تم رفض البوت وطرده',yes?'ok':'warn')})
      .catch(function(e){toast(e.message,'warn',5000)})
      .then(loadBots);
  });
}
function loadSync(){
  api('/sync/status').then(function(j){
    var t=$('syncState');if(!t)return;
    if(!j.targets){t.textContent='🔗 ربط المواقع: غير مفعّل (حط FLASH_MONGO_URI)';return}
    t.textContent=j.error?('🔗 ربط المواقع: ⚠️ '+j.error):('🔗 مرتبط مع '+j.targets+' موقع'+(j.last?' · آخر مزامنة '+new Date(j.last).toLocaleTimeString('ar-SA'):' · بانتظار أول مزامنة'));
  }).catch(function(){});
}
function decodeURIComponentSafe(s){try{return decodeURIComponent(s)}catch(e){return s}}

function resetForGuild(){
  chosen={};chCh={};ordDirty=false;setDirty=false;permForce=true;bkPending=false;lastP=null;
  [].forEach.call(document.querySelectorAll('#backups details.restore[open]'),function(d){d.open=false});
}
/* ===== التحميل (ذكي: يحدّث الأجزاء اللي تغيّرت فقط) ===== */
function applyState(s){
  S=s;showMsg('');
  var n={g:h([s.guilds,s.guildId,s.guildName]),r:h(s.roles),c:h(s.channels),b:h(s.backups),l:h([s.lock,s.settings]),p:h(s.botPending||0)};
  var ch={},any=false;for(var k in n){ch[k]=(n[k]!==sig[k]);if(ch[k])any=true;sig[k]=n[k]}
  if(ch.g)renderGuilds();
  if(ch.r)renderRoles();
  if(ch.r||ch.c)fillAll();
  if(ch.r)renderPerm();
  if(ch.c){renderChans();renderOrder()}
  if(ch.r||ch.b)renderBackups();
  if(ch.r||ch.l)renderSafe();
  if(ch.p){
    var np=s.botPending||0;setBotBadge(np);
    if(lastP!==null&&np>lastP)toast('🤖 طلب بوت جديد بانتظار القرار','warn',5000);
    lastP=np;if(curTab==='bots')loadBots();
  }
  if(any){renderStats();applyQ()}
  return any;
}
function load(){
  if(loading){again=true;return loadP}
  loading=true;
  loadP=(M?Promise.resolve():api('/api/meta').then(function(m){M=m})).then(function(){return api('/api/state')}).then(applyState)
  .catch(function(e){showMsg(e.message);return false})
  .then(function(c){loading=false;if(again){again=false;return load().then(function(c2){return c||c2})}return c});
  return loadP;
}

/* ===== التحديث الفوري (SSE) ===== */
function live(ok,n){
  var b=$('live');b.classList.toggle('off',!ok);
  $('liveTx').textContent=ok?('مباشر'+(n>1?' · '+n+' متصلين':'')):'إعادة الاتصال…';
}
function onChanged(d){
  lastD=d||lastD;clearTimeout(ct);
  ct=setTimeout(function(){
    var d2=lastD;lastD=null;
    load().then(function(changed){
      if(changed&&d2&&d2.by!==CID)toast(d2.why?('🔄 تحديث مباشر: '+d2.why):'🔄 تم تحديث البيانات مباشرةً','info');
      if(curTab==='safe'){loadHistory();loadSync()}
    });
  },200);
}
function parse(e){try{return JSON.parse(e.data)}catch(x){return {}}}
function connect(){
  if(es){es.close();es=null}
  es=new EventSource('/events?cid='+encodeURIComponent(CID));
  es.addEventListener('hello',function(e){var d=parse(e);live(true,d.n);if(d.job&&d.job.by!==CID)attach(d.job)});
  es.addEventListener('presence',function(e){live(true,parse(e).n)});
  es.addEventListener('changed',function(e){onChanged(parse(e))});
  es.addEventListener('guild',function(e){var d=parse(e);if(d.by!==CID){resetForGuild();toast('🔄 تم تغيير السيرفر من جهاز ثاني','info')}onChanged(null)});
  es.addEventListener('jobstart',function(e){var d=parse(e);if(d.by!==CID)attach(d)});
  es.onopen=function(){if(wasDown){wasDown=false;onChanged(null)}};
  es.onerror=function(){
    live(false);wasDown=true;
    if(es&&es.readyState===2){
      fetch('/api/meta',{credentials:'same-origin'}).then(function(r){if(r.status===401)location.href='/login';else setTimeout(connect,3000)}).catch(function(){setTimeout(connect,3000)});
    }
  };
}
document.addEventListener('visibilitychange',function(){if(!document.hidden){connect();onChanged(null)}});
window.addEventListener('pageshow',function(e){if(e.persisted){connect();onChanged(null)}});
window.addEventListener('online',function(){connect();onChanged(null)});

/* ===== الأحداث ===== */
TABS.forEach(function(t){$('b-'+t).addEventListener('click',function(){tab(t)})});
$('q').addEventListener('input',applyQ);
$('guildSel').addEventListener('change',function(){api('/api/guild','POST',{guildId:this.value}).then(function(){resetForGuild();return load()}).catch(function(e){showMsg(e.message)})});
$('selectAll').addEventListener('click',function(){S.roles.forEach(function(r){chosen[r.id]=true});renderRoles()});
$('clearAll').addEventListener('click',function(){chosen={};renderRoles()});
$('backupBtn').addEventListener('click',function(){var i=$('label'),l=i.value;i.value='';runJob('نسخ الرتب والرومات','/api/backup',{label:l})});
$('deleteBtn').addEventListener('click',function(){
  var ids=Object.keys(chosen).filter(function(k){return chosen[k]});
  if(!ids.length){notify('حدد رتبة واحدة على الأقل.');return}
  maybe('متأكد من حذف '+ids.length+' رتبة؟\nتقدر تتراجع من تبويب الأمان لكن الرتبة ترجع بدون أعضائها.',{title:'حذف الرتب',ok:'حذف',danger:true,icon:'🗑️'}).then(function(ok){
    if(ok)runJob('حذف الرتب','/api/delete',{roleIds:ids});
  });
});
$('pclose').addEventListener('click',function(){$('progress').hidden=true});
$('oclose').addEventListener('click',function(){$('out').hidden=true});
$('pr').addEventListener('change',function(){renderPerm(true)});
$('permReload').addEventListener('click',function(){renderPerm(true)});
$('ordReload').addEventListener('click',function(){renderOrder(true)});
$('savePerm').addEventListener('click',savePerms);
$('cmpBtn').addEventListener('click',doCompare);
$('cpRole').addEventListener('click',function(){
  if(val('pr')===val('cpTo')){notify('اختر رتبة ثانية.');return}
  maybe('نسخ صلاحيات الرتبة المحددة فوق صلاحيات الهدف؟ (تُستبدل)',{title:'نسخ صلاحيات رتبة',ok:'انسخ',icon:'📋'}).then(function(ok){
    if(ok)runJob('نسخ صلاحيات رتبة','/api/copy-role',{from:val('pr'),to:val('cpTo')});
  });
});
$('ccBtn').addEventListener('click',function(){
  if(val('ccA')===val('ccB')){notify('اختر روميّن مختلفين.');return}
  maybe('نسخ صلاحيات الروم الأول فوق الثاني؟ (تُستبدل)',{title:'نسخ صلاحيات روم',ok:'انسخ',icon:'📋'}).then(function(ok){
    if(ok)runJob('نسخ صلاحيات روم','/api/copy-channel',{from:val('ccA'),to:val('ccB')});
  });
});
$('chAll').addEventListener('click',function(){S.channels.forEach(function(c){if(c.type!==4)chCh[c.id]=true});renderChans()});
$('chNone').addEventListener('click',function(){chCh={};renderChans()});
$('bulkBtn').addEventListener('click',function(){
  var ids=Object.keys(chCh).filter(function(k){return chCh[k]});
  if(!ids.length){notify('حدد روم واحد على الأقل.');return}
  runJob('تعديل جماعي','/api/bulk',{channelIds:ids,target:val('bkT'),perm:val('bkP'),value:val('bkV')});
});
$('tpBtn').addEventListener('click',function(){
  runJob('إنشاء روم من قالب','/api/template',{type:val('tpType'),name:val('tpName'),categoryId:val('tpCat'),staffRoleId:val('tpRole')});
});
$('ordSave').addEventListener('click',saveOrder);
$('ordReset').addEventListener('click',function(){renderOrder(true)});
$('efBtn').addEventListener('click',doEffective);
$('probBtn').addEventListener('click',doProblems);
$('lockBtn').addEventListener('click',function(){
  maybe('تُخفى كل الرومات عن الجميع وينشأ روم تحذير، وتنقفل المواقع المرتبطة (فلاش) بشاشة حمراء فيها نص الإنذار.\nمتأكد تبي تقفل السيرفر؟',{title:'قفل الطوارئ',ok:'🚨 اقفل الآن',danger:true,icon:'🚨'}).then(function(ok){
    if(ok)runJob('🚨 قفل الطوارئ','/api/lockdown',{reason:val('lockReason'),clearChannelId:val('lockClear').trim()},true);
  });
});
$('unlockBtn').addEventListener('click',function(){
  ask('فتح السيرفر وإرجاع كل الصلاحيات كما كانت؟',{title:'فتح السيرفر',ok:'🔓 افتح',icon:'🔓'}).then(function(ok){
    if(ok)runJob('فتح السيرفر','/api/unlock',{},true);
  });
});
$('exempt').addEventListener('change',function(){setDirty=true});
$('autoBk').addEventListener('change',function(){setDirty=true});
$('saveSet').addEventListener('click',function(){
  var ex=[].slice.call($('exempt').querySelectorAll('input:checked')).map(function(x){return x.value});
  api('/api/settings','POST',{exempt:ex,auto:$('autoBk').checked},'حفظ الإعدادات').then(function(){setDirty=false;toast('تم حفظ الإعدادات','ok');return load()}).catch(function(e){showMsg(e.message)});
});
$('backups').addEventListener('toggle',function(){if(bkPending&&!document.querySelector('#backups details.restore[open]'))renderBackups()},true);

$('peCh').addEventListener('change',peUpd);
$('peReset').addEventListener('click',peReset);
$('peApply').addEventListener('click',function(){
  var ids=peIds();if(!ids.length){notify('اختر روم أو حدد رومات من القائمة.');return}
  var rows=[].slice.call($('peBox').querySelectorAll('.pe')).filter(function(r){return r.dataset.v});
  if(!rows.length){notify('ما غيّرت أي صلاحية.');return}
  var tg=val('peRole'),VN={allow:'سماح',deny:'منع',neutral:'إلغاء التخصيص'};
  maybe('تطبيق '+rows.length+' تغيير على '+ids.length+' روم للرتبة «'+selText('peRole')+'»؟',{title:'صلاحيات الروم',ok:'طبّق',icon:'🎚️'}).then(function(ok){
    if(!ok)return;
    runChain('صلاحيات الروم',rows.map(function(r){return {path:'/api/bulk',label:permName(r.dataset.k).ar+' ← '+VN[r.dataset.v],body:{channelIds:ids,target:tg,perm:r.dataset.k,value:r.dataset.v}}}),peReset);
  });
});

/* ===== تشغيل ===== */
[].forEach.call(document.querySelectorAll('select'),enhance);
function hh(){var x=document.querySelector('header');if(x)document.documentElement.style.setProperty('--hh',x.offsetHeight+'px')}
hh();window.addEventListener('resize',hh);window.addEventListener('load',hh);
if(window.ResizeObserver)new ResizeObserver(hh).observe(document.querySelector('header'));
var h0=location.hash.slice(1);if(TABS.indexOf(h0)>=0)tab(h0);
load().then(connect);
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
      <p class="muted">أي تغيير يسويه أي شخص داخل الموقع يظهر عند الكل فوراً بدون تحديث.</p>
      <div class="row"><span class="muted">السيرفر الحالي:</span><select id="guildSel" class="g" data-t="اختر السيرفر"></select></div>
      <div class="stats" id="stats"></div>
      <div id="msg"></div>
    </section>

    <div class="tabs">
      <button class="tab on" id="b-roles" type="button">🗂️ الرتب والنسخ</button>
      <button class="tab" id="b-perms" type="button">🔑 الصلاحيات</button>
      <button class="tab" id="b-chans" type="button">💬 الرومات</button>
      <button class="tab" id="b-check" type="button">🔍 فحص ومقارنة</button>
      <button class="tab" id="b-bots" type="button">🤖 طلبات البوتات<span class="tbadge" id="botBadge" hidden>0</span></button>
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
        <h2>💾 نسخ السيرفر (رتب + رومات + صلاحيات)</h2>
        <p class="muted">يحفظ الرتب والرومات والتصنيفات وصلاحياتها. ينسخ تلقائياً كل يوم، وتقدر تنسخ يدوياً.</p>
        <label>اسم النسخة (اختياري)</label>
        <input type="text" id="label" maxlength="80" placeholder="مثال: قبل التحديث">
        <button class="btn good" type="button" id="backupBtn">نسخ الآن</button>
      </section>
      <section class="card">
        <h2>🗑️ حذف الرتب المحددة</h2>
        <div class="row"><button type="button" class="btn secondary sm" id="selectAll">تحديد الكل</button>
        <button type="button" class="btn secondary sm" id="clearAll">إلغاء</button><span class="muted" id="count">0 محدد</span></div>
        <div class="roles" id="roles"></div>
        <div class="alert">الحذف يمكن التراجع عنه من تبويب الأمان، لكن الرتبة ترجع بدون أعضائها.</div>
        <button class="btn danger" type="button" id="deleteBtn">حذف الرتب المحددة</button>
      </section>
    </div>
    <section class="card" style="margin-top:14px"><h2>📦 النسخ الاحتياطية والنقل بين السيرفرات</h2>
      <p class="muted">لنقل سيرفر كامل: غيّر السيرفر من القائمة فوق ثم افتح «استعادة» على نسخة السيرفر الأول.</p>
      <div id="backups"><p class="muted">جاري التحميل…</p></div></section>`)}

    ${sec("perms", `
    <section class="card">
      <h2>🔑 صلاحيات الرتب</h2>
      <p class="muted">اختر رتبة وعدّل صلاحياتها. الاسم بالعربي والإنجليزي تحته ملاحظة.</p>
      <select id="pr" class="full" data-t="اختر الرتبة"></select>
      <div class="alert warn" id="permNote" hidden>⚠️ تغيّرت صلاحيات هذه الرتبة من جهاز ثاني وعندك تعديلات ما انحفظت.
        <div class="row"><button class="btn secondary sm" id="permReload" type="button">تجاهل تعديلاتي وحدّث</button></div></div>
      <div id="permBox"></div>
      <button class="btn good" type="button" id="savePerm">حفظ التعديلات</button>
    </section>
    <section class="card">
      <h2>📋 نسخ صلاحيات الرتبة المحددة إلى رتبة ثانية</h2>
      <div class="row"><select id="cpTo" data-t="انسخ إلى رتبة"></select><button class="btn" type="button" id="cpRole">نسخ بضغطة</button></div>
      <h2 style="margin-top:18px">⚖️ مقارنة الرتبة المحددة برتبة ثانية</h2>
      <div class="row"><select id="cmpB" data-t="قارن مع رتبة"></select><button class="btn secondary" type="button" id="cmpBtn">قارن</button></div>
    </section>`)}

    ${sec("chans", `
    <div class="grid">
      <section class="card">
        <h2>⚙️ تعديل جماعي</h2>
        <p class="muted">حدد الرومات من القائمة تحت، ثم اختر الرتبة والصلاحية.</p>
        <label>الرتبة</label><select id="bkT" class="full" data-t="الرتبة"></select>
        <label>الصلاحية</label><select id="bkP" class="full" data-t="الصلاحية"></select>
        <label>الإجراء</label>
        <select id="bkV" class="full" data-t="الإجراء"><option value="allow">سماح</option><option value="deny">منع</option><option value="neutral">إلغاء التخصيص</option></select>
        <button class="btn" type="button" id="bulkBtn">تطبيق على المحدد</button>
      </section>
      <section class="card">
        <h2>✨ روم جاهز من قالب</h2>
        <select id="tpType" class="full" data-t="نوع القالب">
          <option value="announce">📢 إعلانات (قراءة فقط)</option><option value="chat">💬 دردشة</option>
          <option value="staff">🔒 إدارة (مخفي)</option><option value="voice">🔊 صوت</option></select>
        <input type="text" id="tpName" maxlength="90" placeholder="اسم الروم (اختياري)">
        <label>التصنيف</label><select id="tpCat" class="full" data-t="التصنيف"></select>
        <label>رتبة الإدارة (لقالب الإدارة)</label><select id="tpRole" class="full" data-t="رتبة الإدارة"></select>
        <button class="btn good" type="button" id="tpBtn">إنشاء</button>
      </section>
      <section class="card">
        <h2>🔁 نسخ صلاحيات روم لروم</h2>
        <label>من</label><select id="ccA" class="full" data-t="من روم"></select>
        <label>إلى (تُستبدل صلاحياته)</label><select id="ccB" class="full" data-t="إلى روم"></select>
        <button class="btn" type="button" id="ccBtn">نسخ بضغطة</button>
      </section>
    </div>
    <section class="card" style="margin-top:14px">
      <h2>💬 الرومات والتصنيفات</h2>
      <div class="row"><button type="button" class="btn secondary sm" id="chAll">تحديد الكل</button>
      <button type="button" class="btn secondary sm" id="chNone">إلغاء</button><span class="muted" id="chCount">0 محدد</span></div>
      <div id="chList"></div>
    </section>
    <section class="card">
      <h2>🎚️ صلاحيات الروم (تعديل كامل)</h2>
      <p class="muted">اختر الرتبة، وحدد الروم (أو حدد عدة رومات من القائمة فوق)، وبعدين لكل صلاحية اختر: — بدون تغيير · ✅ سماح · ❌ منع · ↺ إلغاء التخصيص. اللي تحطه فقط ينطبق.</p>
      <label>الرتبة</label><select id="peRole" class="full" data-t="الرتبة"></select>
      <label>الروم</label><select id="peCh" class="full" data-t="اختر الروم"></select>
      <div class="tgt" id="peTgt"></div>
      <div id="peBox"></div>
      <div class="row"><button class="btn good" type="button" id="peApply">تطبيق التغييرات</button>
      <button class="btn secondary" type="button" id="peReset">تصفير الاختيارات</button></div>
    </section>
    <section class="card">
      <h2>↕️ ترتيب الرومات والتصنيفات</h2>
      <p class="muted">اضغط على ☰ واسحب الروم لمكانه. اسحب التصنيف وتتحرك معه رومّاته. الروم يدخل تحت التصنيف اللي فوقه. بعدين اضغط «حفظ الترتيب».</p>
      <div class="alert warn" id="ordNote" hidden>⚠️ تغيّر ترتيب الرومات من جهاز ثاني وعندك ترتيب ما انحفظ.
        <div class="row"><button class="btn secondary sm" id="ordReload" type="button">تجاهل ترتيبي وحدّث</button></div></div>
      <div id="ordList"></div>
      <div class="row"><button class="btn good" type="button" id="ordSave">حفظ الترتيب</button>
      <button class="btn secondary" type="button" id="ordReset">تراجع عن السحب</button></div>
    </section>`)}

    ${sec("check", `
    <section class="card">
      <h2>🧐 وش يقدر يسوي عضو في روم؟</h2>
      <input type="text" id="efQ" placeholder="اسم العضو أو الآيدي">
      <select id="efCh" class="full" data-t="اختر الروم"></select>
      <button class="btn" type="button" id="efBtn">معاينة الصلاحيات الفعلية</button>
    </section>
    <section class="card">
      <h2>🩺 كشف المشاكل</h2>
      <p class="muted">رومات مفتوحة للكل بالغلط، رتب مكررة، رتب فاضية، وصلاحيات خطيرة.</p>
      <button class="btn secondary" type="button" id="probBtn">افحص السيرفر</button>
    </section>`)}

    ${sec("bots", `
    <section class="card">
      <h2>🤖 طلبات تسجيل البوتات</h2>
      <p class="muted">أي بوت جديد يدخل السيرفر يوصل هنا كطلب معلّق وتتجمّد صلاحياته لين تقرر. <b>قبول</b> = البوت يكمل وترجع صلاحياته. <b>رفض</b> = ينطرد من السيرفر.</p>
      <div id="botPend"><p class="muted">جاري التحميل…</p></div>
    </section>
    <section class="card">
      <h2>🗂️ آخر القرارات</h2>
      <div id="botDone"><p class="muted">جاري التحميل…</p></div>
    </section>`)}

    ${sec("safe", `
    <section class="card lockbox" id="lockBox">
      <h2>🚨 قفل الطوارئ</h2>
      <p id="lockState" style="font-weight:800"></p>
      <p class="muted" id="syncState" style="margin-top:-6px"></p>
      <p class="muted">وقت الهجوم أو الاشتباه: يخفي كل الرومات عن الجميع (حتى الرتب الأعلى من البوت) ما عدا مالك السيرفر والرتب المستثناة، وينشئ روم «سيرفر مغلق» برسالة تحذير طويلة، ويوقف الدعوات. الفتح يرجع كل شي كما كان.</p>
      <div class="alert error">⚠️ رتبة «مدير كامل» (Administrator) تتجاوز أي إخفاء، وديسكورد ما يسمح بحجبها.</div>
      <input type="text" id="lockReason" placeholder="نص الإنذار / سبب القفل (يطلع بشاشة حمراء في فلاش)" maxlength="300">
      <input type="text" id="lockClear" inputmode="numeric" placeholder="آيدي شات زوال الخطر (تنرسل فيه رسالة الفتح بالمنشن)">
      <button class="btn danger" type="button" id="lockBtn">🚨 قفل السيرفر الآن</button>
      <button class="btn good" type="button" id="unlockBtn" hidden>🔓 فتح السيرفر</button>
    </section>
    <section class="card">
      <h2>⚙️ الإعدادات</h2>
      <p class="muted">رتب الملكية اللي تشوف الرومات وقت القفل (المالك نفسه دائماً يشوف):</p>
      <div class="roles" id="exempt"></div>
      <label class="pick" style="margin-bottom:10px"><input type="checkbox" id="autoBk"> نسخة احتياطية تلقائية يومياً</label>
      <button class="btn" type="button" id="saveSet">حفظ الإعدادات</button>
      <p class="muted">أوامر السلاش في ديسكورد: ‎/lockdown ‎/unlock ‎/backup ‎/check</p>
    </section>
    <section class="card"><h2>📜 السجل (من غيّر وش ومتى)</h2><div id="hist"><p class="muted">جاري التحميل…</p></div></section>`)}


    <script src="/client.js?v=${BUILD}"></script>`, true));
});

// ============ التحديث الفوري لكل المتصلين (SSE) ============
const clients = new Set();           // كل جهاز/تبويب مفتوح الآن
const activeJobs = new Map();        // guildId -> عملية شغالة
const sseWrite = (c, ev, data) => { try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch {} };
const toGuild = (gid, ev, data) => { for (const c of clients) if (c.gid === gid) sseWrite(c, ev, data); };
const toAll = (ev, data) => { for (const c of clients) sseWrite(c, ev, data); };
const online = () => new Set([...clients].map(c => c.cid)).size;
// السيرفر المختار مشترك بين كل المتصلين
let SHARED_GUILD = "";
const curGuild = req => SHARED_GUILD || req.session.guildId || "";

app.get("/events", requireApi, (req, res) => {
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("retry: 2500\n\n");
  const c = {
    res, sid: req.sessionID,
    cid: String(req.query.cid || crypto.randomBytes(6).toString("hex")).slice(0, 40),
    gid: curGuild(req)
  };
  clients.add(c);
  sseWrite(c, "hello", { n: online(), job: activeJobs.get(c.gid) || null });
  toAll("presence", { n: online() });
  const hb = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
  req.on("close", () => { clearInterval(hb); clients.delete(c); toAll("presence", { n: online() }); });
});


// ============ ربط القفل مع المواقع الثانية (فلاش…) عبر قاعدة بياناتها ============
let MongoClient = null;
try { ({ MongoClient } = require("mongodb")); } catch {}
const syncConns = new Map();
const syncInfo = { last: null, error: "" };
const lockStates = new Map();
const lockReasons = new Map();
const lockPending = new Set();
let synced = null, syncing = false;
const lockGuildOk = gid => !LOCK_SYNC_GUILD_ID || gid === LOCK_SYNC_GUILD_ID;

async function syncDb(uri) {
  let p = syncConns.get(uri);
  if (!p) { p = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 2 }).connect(); syncConns.set(uri, p); }
  try { return (await p).db(); } catch (e) { syncConns.delete(uri); throw e; }
}
async function writeLock(active, reason) {
  if (!MongoClient) { syncInfo.error = "مكتبة mongodb غير مثبتة (أضفها في package.json)"; return false; }
  const doc = { active: !!active, reason: String(reason || "").slice(0, 600), title: "", by: "role-vault", at: new Date() };
  let ok = 0; const errs = [];
  for (const uri of SYNC_URIS) {
    try {
      const db = await syncDb(uri);
      await db.collection("rolevault_lock").updateOne({ _id: "lock" }, { $set: doc, $inc: { rev: 1 } }, { upsert: true });
      ok++;
    } catch (e) { errs.push(e.message); }
  }
  syncInfo.error = errs.join(" | ").slice(0, 300);
  if (ok === SYNC_URIS.length) { syncInfo.last = Date.now(); return true; }
  return false;
}
async function reconcileLock() {
  if (!SYNC_URIS.length || syncing) return;
  syncing = true;
  try {
    let active = false, reason = "";
    for (const [gid, s] of lockStates) if (lockGuildOk(gid) && s.active) { active = true; reason = s.reason || reason; }
    if (synced && synced.active === active && (!active || synced.reason === reason)) return;
    if (await writeLock(active, active ? (reason || "تم قفل السيرفر لأسباب أمنية.") : "")) synced = { active, reason };
  } finally { syncing = false; }
}
function noteLock(gid, j) {
  const L = j && j.lock;
  if (!L || !lockGuildOk(gid)) return;
  const active = !!L.active;
  if (!active && lockPending.has(gid)) return;
  const reason = String(L.reason || L.message || lockReasons.get(gid) || "");
  lockStates.set(gid, { active, reason });
  if (!active) lockReasons.delete(gid);
}
app.get("/sync/status", requireApi, (req, res) => {
  res.json({ targets: SYNC_URIS.length, driver: !!MongoClient, last: syncInfo.last, error: syncInfo.error, active: synced ? synced.active : null });
});

// يتابع العملية لين تخلص ثم يبلّغ الكل يحدّثون
async function watchJob(jobId, gid, by, title) {
  activeJobs.set(gid, { jobId, title, by });
  toGuild(gid, "jobstart", { jobId, title, by });
  let since = 0, fails = 0;
  const t0 = Date.now();
  while (fails < 20 && Date.now() - t0 < 30 * 60 * 1000) {
    await new Promise(r => setTimeout(r, 900));
    try {
      const j = await bot("/api/job/" + encodeURIComponent(jobId) + "?since=" + since + "&guildId=" + encodeURIComponent(gid), "GET", undefined, "auto");
      fails = 0; if (j.next != null) since = j.next;
      if (j.done) break;
    } catch { fails++; }
  }
  const a = activeJobs.get(gid);
  if (a && a.jobId === jobId) activeJobs.delete(gid);
  lockPending.delete(gid);
  toGuild(gid, "changed", { by, why: title });
  if (SYNC_URIS.length) { try { noteLock(gid, await bot("/api/state?guildId=" + encodeURIComponent(gid), "GET", undefined, "auto")); } catch {} reconcileLock(); }
}

// يراقب تغييرات تصير من برا الموقع (أوامر ديسكورد، النسخ التلقائي…)
const lastSig = new Map();
let ticking = false;
async function watchTick() {
  if (ticking) return; ticking = true;
  try {
    const gids = new Set([...clients].map(c => c.gid).filter(Boolean));
    if (SYNC_URIS.length && LOCK_SYNC_GUILD_ID) gids.add(LOCK_SYNC_GUILD_ID);
    for (const gid of gids) {
      try {
        const j = await bot("/api/state?guildId=" + encodeURIComponent(gid), "GET", undefined, "auto");
        const s = crypto.createHash("sha1").update(JSON.stringify(j)).digest("hex");
        const prev = lastSig.get(gid);
        lastSig.set(gid, s);
        if (prev && prev !== s) toGuild(gid, "changed", { by: "bot" });
        if (SYNC_URIS.length) noteLock(gid, j);
      } catch {}
    }
    if (SYNC_URIS.length) reconcileLock();
    for (const g of [...lastSig.keys()]) if (!gids.has(g)) lastSig.delete(g);
  } finally { ticking = false; }
}
setInterval(watchTick, 5000);

function afterMutation(req, gid, j) {
  const cid = String(req.get("x-cid") || "").slice(0, 40);
  let title = ""; try { title = decodeURIComponent(req.get("x-job-title") || ""); } catch {}
  title = title.slice(0, 80);
  if (SYNC_URIS.length && req.path === "/lockdown" && !(req.body && req.body.dry)) {
    const reason = String((req.body && req.body.reason) || "").trim();
    lockReasons.set(gid, reason); lockStates.set(gid, { active: true, reason }); lockPending.add(gid);
    reconcileLock();
  }
  if (SYNC_URIS.length && req.path === "/unlock" && !(req.body && req.body.dry)) lockReasons.delete(gid);
  if (j && j.jobId) watchJob(j.jobId, gid, cid, title);
  else toGuild(gid, "changed", { by: cid, why: title });
}

// ============ API: يمرّر كل شي للبوت مع تثبيت السيرفر الحالي ============
app.use("/api", requireApi, async (req, res) => {
  try {
    if (req.path === "/guild" && req.method === "POST") {
      const g = String((req.body && req.body.guildId) || "");
      req.session.guildId = g; SHARED_GUILD = g;
      for (const c of clients) c.gid = g;
      toAll("guild", { gid: g, by: String(req.get("x-cid") || "").slice(0, 40) });
      return res.json({ ok: true });
    }
    const gid = curGuild(req);
    let path = req.originalUrl;
    if (req.method === "GET") path += (path.includes("?") ? "&" : "?") + "guildId=" + encodeURIComponent(gid);
    const body = req.method === "GET" ? undefined : { ...req.body, guildId: gid };
    const j = await bot(path, req.method, body, req.ip);
    if (req.path === "/state" && j.guildId) { req.session.guildId = j.guildId; if (!SHARED_GUILD) SHARED_GUILD = j.guildId; for (const c of clients) if (c.sid === req.sessionID && !c.gid) c.gid = j.guildId; }
    if (req.method !== "GET") afterMutation(req, gid, j);
    res.json(j);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/health", (req, res) => res.send("ok"));
app.listen(PORT, "0.0.0.0", () => console.log("Role Vault web on " + PORT));
