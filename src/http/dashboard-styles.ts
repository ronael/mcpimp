export const DASHBOARD_STYLES = `
:root{
  color-scheme:dark;
  --ink:#0a0a0a; --panel:#181818; --panel-strong:#1f1f1f;
  --line:#313131; --line-soft:#272727;
  --paper:#f7f7f2; --muted:#a8a8a2; --lift:#141413;
  --acid:#c9ff3d; --cyan:#63e6ff; --coral:#ff7a66; --violet:#bda7ff; --amber:#f3c677;
  --ease:cubic-bezier(0.32,0.72,0,1);
  --sans:"Geist Variable",Geist,-apple-system,system-ui,sans-serif;
  --mono:"Geist Mono Variable",ui-monospace,Menlo,monospace;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{background:var(--ink);scroll-behavior:smooth;scroll-padding-top:84px}
body{background:var(--ink);color:var(--paper);font-family:var(--sans);font-size:14.5px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:none;color:var(--acid)}
button{font:inherit;cursor:pointer;background:none;border:0;color:inherit}
::selection{background:var(--acid);color:var(--ink)}
:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
code{font-family:var(--mono);font-size:.88em;color:var(--cyan)}
.mono{font-family:var(--mono)}
.muted{color:var(--muted)}
.wrap{white-space:normal;overflow-wrap:anywhere}
.jp{color:var(--acid)} .js{color:var(--amber)}
.side{position:fixed;inset:0 auto 0 0;width:256px;z-index:60;display:flex;flex-direction:column;gap:4px;padding:18px 14px 16px;border-right:1px solid var(--line);background:var(--lift)}
.side-brand{display:flex;align-items:center;gap:9px;padding:6px 8px 16px;font-weight:700;font-size:16px}
.brand-mark{display:grid;width:28px;height:28px;place-items:center;border-radius:6px;background:var(--acid);color:var(--ink);font-size:14px;font-weight:750;flex:0 0 auto}
.side-brand .sub{color:var(--muted);font-weight:600;font-size:11.5px;font-family:var(--mono);padding-left:9px;border-left:1px solid var(--line)}
.side-search{position:relative;margin-bottom:14px}
.side-search i,.searchbox i{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:15px;pointer-events:none}
.side-search input,.searchbox input{width:100%;padding:9px 40px 9px 34px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--paper);font-family:var(--sans);font-size:13px;transition:border-color .4s var(--ease)}
.side-search input::placeholder,.searchbox input::placeholder{color:#6f6f69}
.side-search input:focus,.searchbox input:focus{outline:0;border-color:rgba(201,255,61,.5)}
.side-search kbd{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:4px;background:var(--panel-strong);border:1px solid var(--line);color:var(--muted)}
.snav-label{font-family:var(--mono);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6f6f69;padding:10px 10px 6px}
.snav a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;color:var(--muted);font-size:13.5px;font-weight:600;transition:color .35s var(--ease),background .35s var(--ease)}
.snav a i{font-size:16px}
.snav a:hover{background:var(--panel);color:var(--paper)}
.snav a.act{background:var(--panel);color:var(--acid)}
.snav a .cnt{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:#6f6f69;background:var(--panel-strong);border:1px solid var(--line-soft);border-radius:4px;padding:1px 6px}
.snav a.act .cnt{color:var(--acid);border-color:rgba(201,255,61,.3)}
.side-foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--line-soft)}
.side-status{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(201,255,61,.35);border-radius:6px;background:rgba(201,255,61,.07);color:var(--acid);font-family:var(--mono);font-size:11px}
.side-status::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--acid);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.side-note{margin-top:10px;font-family:var(--mono);font-size:10.5px;color:#6f6f69;line-height:1.6;padding:0 2px}
.mtop{display:none}
.main{margin-left:256px;padding:36px 40px 80px;min-height:100vh}
.view{display:none}
.view.on{display:block;animation:vin .5s var(--ease)}
@keyframes vin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.v-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px;flex-wrap:wrap}
.v-head h1{font-size:26px;font-weight:650;letter-spacing:0}
.v-head .sub{color:var(--muted);font-size:13.5px;margin-top:6px;max-width:640px;text-wrap:pretty}
.v-head .sub strong{color:var(--paper);font-weight:600}
.kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;color:var(--acid);font-family:var(--mono);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.kicker::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--acid);box-shadow:0 0 0 3px rgba(201,255,61,.12)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:20px}
.stat{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:18px 20px;transition:border-color .5s var(--ease),transform .5s var(--ease)}
.stat:hover{border-color:#464646;transform:translateY(-2px)}
.stat .s-ic{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px}
.stat .s-ic i{font-size:18px;color:var(--muted)}
.stat .trend{font-family:var(--mono);font-size:10.5px;color:var(--muted);text-align:right}
.stat .v{display:block;font-size:32px;font-weight:650;color:var(--acid);line-height:1}
.stat .l{display:block;margin-top:7px;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.panel{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:22px;margin-bottom:20px}
.panel>.p-h{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
.panel>.p-h h2{display:flex;align-items:center;gap:10px;font-size:15.5px;font-weight:620}
.panel>.p-h h2 i{font-size:18px;color:var(--acid)}
.panel>.p-h .p-meta{font-family:var(--mono);font-size:11px;color:var(--muted);white-space:nowrap}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.step{border:1px solid var(--line-soft);border-radius:8px;background:var(--lift);padding:14px 15px;min-height:104px;transition:border-color .5s var(--ease)}
.step:hover{border-color:rgba(201,255,61,.4)}
.step .n{font-family:var(--mono);font-size:10.5px;color:var(--acid)}
.step strong{display:block;margin:7px 0 5px;font-size:13.5px;font-weight:620}
.step p{font-size:12px;color:var(--muted);line-height:1.5}
.dist{display:flex;flex-direction:column;gap:14px}
.dist-row{display:flex;align-items:center;gap:12px}
.dist-row .dl{width:132px;flex:0 0 auto;font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dist-track{flex:1;height:22px;border-radius:5px;background:var(--lift);border:1px solid var(--line-soft);overflow:hidden;display:flex}
.dist-track i{display:block;height:100%;transition:width .9s var(--ease)}
.dist-val{font-family:var(--mono);font-size:11.5px;color:var(--muted);flex:0 0 auto;min-width:64px;text-align:right}
.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.searchbox{position:relative;flex:1 1 260px;max-width:420px}
.fchips{display:flex;gap:6px;flex-wrap:wrap}
.fchip{padding:7px 13px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--muted);font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.03em;transition:all .35s var(--ease)}
.fchip:hover{border-color:#4b4b4b;color:var(--paper)}
.fchip.act{background:rgba(201,255,61,.08);border-color:rgba(201,255,61,.4);color:var(--acid)}
select.sel{padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--muted);font-family:var(--mono);font-size:12px;cursor:pointer;transition:border-color .4s}
select.sel:focus{outline:0;border-color:rgba(201,255,61,.5)}
select.sel option{background:var(--panel);color:var(--paper)}
.result-count{margin-left:auto;font-family:var(--mono);font-size:11.5px;color:var(--muted);white-space:nowrap}
.result-count b{color:var(--acid);font-weight:600}
.tbl-wrap{border:1px solid var(--line-soft);border-radius:8px;overflow-x:auto;background:var(--lift)}
.tbl-wrap.flush{border:0;background:transparent}
table.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{font-family:var(--mono);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:10px 16px;background:var(--panel-strong);border-bottom:1px solid var(--line)}
.tbl td{padding:11px 16px;border-top:1px solid var(--line-soft);color:var(--muted);vertical-align:middle;line-height:1.5}
.tbl tbody tr{transition:background .25s}
.tbl tbody tr:hover{background:rgba(247,247,242,.025)}
.tbl td.mono{font-family:var(--mono);font-size:12px;color:var(--paper);white-space:nowrap}
.tbl a{color:var(--cyan)}
.tbl a:hover{color:var(--acid)}
.num-c{font-family:var(--mono);color:var(--paper)}
tr.caprow td:last-child{color:#6f6f69;font-size:13px}
tr.caprow{cursor:pointer}
tr.caprow:focus-visible{outline:2px solid var(--cyan);outline-offset:-2px}
.row-action{padding:4px 8px;border:1px solid var(--line);border-radius:6px;color:var(--cyan);font-family:var(--mono);font-size:11px;background:var(--panel-strong)}
.row-action:hover{color:var(--acid);border-color:rgba(201,255,61,.35)}
.capname{display:flex;flex-direction:column;gap:1px}
.capname strong{color:var(--paper);font-size:13.5px;font-weight:620}
.cid{font-family:var(--mono);font-size:10.5px;color:#6f6f69}
.capdesc{display:block;color:var(--muted);font-size:12px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.empty-row td{padding:36px 16px!important;text-align:center;color:var(--muted);font-size:13px}
.empty-row i{display:block;font-size:22px;margin-bottom:8px;color:#4b4b4b}
.chip{display:inline-flex;align-items:center;gap:6px;padding:2px 9px;border-radius:999px;font-family:var(--mono);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.chip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.chip.ok{color:var(--acid);border-color:rgba(201,255,61,.3);background:rgba(201,255,61,.06)}
.chip.warn{color:var(--amber);border-color:rgba(243,198,119,.3);background:rgba(243,198,119,.06)}
.chip.err{color:var(--coral);border-color:rgba(255,122,102,.3);background:rgba(255,122,102,.06)}
.chip.info{color:var(--cyan);border-color:rgba(99,230,255,.3);background:rgba(99,230,255,.06)}
.chip.vio{color:var(--violet);border-color:rgba(189,167,255,.3);background:rgba(189,167,255,.06)}
.chip.plain::before{display:none}
.method{font-family:var(--mono);font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:.04em}
.method.get{color:var(--acid);background:rgba(201,255,61,.08);border:1px solid rgba(201,255,61,.3)}
.method.post{color:var(--cyan);background:rgba(99,230,255,.08);border:1px solid rgba(99,230,255,.3)}
.term{border:1px solid #3c3c3c;border-radius:8px;background:#0c0c0b;overflow:hidden}
.term-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 15px;border-bottom:1px solid var(--line);background:var(--panel);font-family:var(--mono);font-size:11px;color:var(--muted)}
.term-bar .dots{display:inline-flex;gap:6px}
.term-bar .dots i{width:9px;height:9px;border-radius:50%;background:var(--line)}
.term-bar .dots i:first-child{background:rgba(255,122,102,.6)}
.term-bar .dots i:nth-child(2){background:rgba(243,198,119,.6)}
.term-bar .dots i:nth-child(3){background:rgba(201,255,61,.6)}
.term pre{padding:16px 18px;font-family:var(--mono);font-size:12px;line-height:1.7;color:var(--paper);overflow-x:auto;white-space:pre}
.cap-details{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.capability{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:22px;margin-top:16px}
.capability header{display:flex;align-items:start;justify-content:space-between;gap:20px;margin-bottom:8px}
.capability h2{font-size:17px;font-weight:650;letter-spacing:0;margin-bottom:2px}
.capability header p{margin-top:8px;color:var(--muted);max-width:760px}
.capability header strong{color:var(--acid);white-space:nowrap;font-family:var(--mono);font-size:12px}
.badge{border:1px solid var(--line);border-radius:4px;color:var(--muted);font-size:11px;font-weight:500;padding:2px 6px;vertical-align:middle}
.capability table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
.capability th,.capability td{border-top:1px solid var(--line-soft);padding:9px 8px;text-align:left;vertical-align:top;color:var(--muted)}
.capability th{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.references{border-top:1px solid var(--line);margin-top:16px;padding-top:14px}
.references h3{font-size:14px;margin-bottom:12px}
.references h4{margin:0;color:var(--muted);font-size:13px;font-weight:600}
.reference-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:16px}
.backdrop{position:fixed;inset:0;z-index:80;background:rgba(5,5,5,.55);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .45s var(--ease)}
.backdrop.on{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;z-index:90;width:min(560px,94vw);background:var(--lift);border-left:1px solid var(--line);transform:translateX(103%);transition:transform .55s var(--ease);overflow-y:auto;overscroll-behavior:contain;box-shadow:-32px 0 80px rgba(0,0,0,.4)}
.drawer.on{transform:none}
.drawer-in{padding:26px 28px 48px}
.d-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
.d-top .d-id{font-family:var(--mono);font-size:11px;color:var(--muted);overflow-wrap:anywhere}
.d-close{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:6px;color:var(--muted);font-size:17px;transition:all .35s var(--ease)}
.d-close:hover{color:var(--paper);border-color:#4b4b4b;transform:rotate(90deg)}
.d-title{font-size:24px;font-weight:650;letter-spacing:0;margin-bottom:10px;overflow-wrap:anywhere}
.d-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.d-desc{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:6px;text-wrap:pretty}
.d-sec{margin-top:26px;padding-top:18px;border-top:1px solid var(--line-soft)}
.d-sec>.cs-h{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:13px}
.d-sec>.cs-h i{font-size:15px;color:var(--acid)}
.d-sec .tbl-wrap+.tbl-wrap{margin-top:14px}
.ref-files{margin-bottom:14px}
.prov{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line-soft);border:1px solid var(--line-soft);border-radius:8px;overflow:hidden}
.prov>div{background:var(--panel);padding:11px 14px}
.prov .k{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#6f6f69;margin-bottom:4px}
.prov .vv{font-family:var(--mono);font-size:11.5px;color:var(--paper);overflow-wrap:anywhere;line-height:1.5}
.note-inline{display:flex;gap:8px;align-items:center;margin-top:13px;font-size:12px;color:var(--amber)}
.note-inline i{font-size:15px}
@media(max-width:1200px){
  .stats,.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}
  .flow{grid-template-columns:repeat(2,1fr)}
  .capdesc{max-width:200px}
}
@media(max-width:1000px){
  .side{display:none}
  .mtop{position:fixed;top:0;left:0;right:0;z-index:60;display:flex;align-items:center;gap:2px;padding:8px 12px;border-bottom:1px solid var(--line);background:rgba(20,20,19,.9);backdrop-filter:blur(18px);overflow-x:auto;scrollbar-width:none}
  .mtop::-webkit-scrollbar{display:none}
  .mtop .brand-mark{width:26px;height:26px;font-size:13px;margin-right:8px}
  .mtop a{flex:0 0 auto;padding:7px 10px;border-radius:6px;color:var(--muted);font-size:12.5px;font-weight:600;white-space:nowrap}
  .mtop a.act{background:var(--panel);color:var(--acid)}
  .main{margin-left:0;padding:76px 20px 64px}
}
@media(max-width:760px){
  .stats,.grid2,.flow,.reference-grid{grid-template-columns:1fr}
  .main{padding-left:16px;padding-right:16px}
  .panel,.capability{padding:16px}
  .capability header{flex-direction:column}
  .dist-row{align-items:flex-start;flex-direction:column;gap:6px}
  .dist-row .dl,.dist-val{width:auto;min-width:0;text-align:left}
  .dist-track{width:100%}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
}
`;
