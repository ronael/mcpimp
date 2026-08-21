export const DASHBOARD_STYLES = `
:root {
  color-scheme: dark;
  --bg: #0a0a0a;
  --panel: #181818;
  --panel-soft: #1f1f1f;
  --text: #f7f7f2;
  --muted: #a8a8a2;
  --line: #313131;
  --accent: #c9ff3d;
  --ok: #63e6ff;
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --sans: "Geist Variable", Geist, -apple-system, system-ui, sans-serif;
  --mono: "Geist Mono Variable", ui-monospace, Menlo, monospace;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 86px; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.5 var(--sans);
  -webkit-font-smoothing: antialiased;
}
main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
h1 { margin: 0; font-size: 32px; letter-spacing: 0; }
h2 { margin: 0 0 4px; font-size: 18px; letter-spacing: 0; }
h3 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0; }
p { margin: 0; color: var(--muted); }
code { color: var(--accent); font-family: var(--mono); font-size: 13px; }
.dashboard-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin: -32px -20px 24px;
  padding: 14px 20px;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}
.dashboard-nav a {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  color: var(--text);
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.2;
  transition: border-color .5s var(--ease), color .5s var(--ease), transform .5s var(--ease);
}
.dashboard-nav a:hover,
.dashboard-nav a:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
  text-decoration: none;
  transform: translateY(-1px);
}
.top {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: start;
  margin-bottom: 24px;
}
.stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.stat {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 10px 12px;
  min-width: 120px;
}
.stat strong { display: block; font-size: 22px; color: var(--ok); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
.panel, .capability {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 18px;
}
.flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}
.step {
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 12px;
  min-height: 92px;
}
.step strong { display: block; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border-top: 1px solid var(--line); padding: 9px 8px; text-align: left; vertical-align: top; }
th { color: var(--muted); font-weight: 600; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.capability { margin-top: 16px; }
.badge {
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  vertical-align: middle;
}
.capability header { display: flex; align-items: start; justify-content: space-between; gap: 20px; margin-bottom: 8px; }
.capability header strong { color: var(--ok); white-space: nowrap; }
.references {
  border-top: 1px solid var(--line);
  margin-top: 16px;
  padding-top: 14px;
}
.references h4 {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
.reference-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 16px;
}
pre {
  overflow-x: auto;
  border: 1px solid var(--line);
  background: #0a0a09;
  border-radius: 8px;
  padding: 14px;
  margin: 10px 0 0;
  color: var(--text);
}
@media (max-width: 820px) {
  .top, .grid, .flow, .reference-grid { grid-template-columns: 1fr; }
  .stats { justify-content: flex-start; }
}
`;
