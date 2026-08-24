import type { DashboardCopy } from "./dashboard-i18n";
import { escapeHtml } from "./dashboard-helpers";

export function renderDashboardScript(copy: DashboardCopy, totalCapabilities: number): string {
  return `<script>
(() => {
  const views = [...document.querySelectorAll("[data-view]")];
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const rows = [...document.querySelectorAll("[data-capability-row]")];
  const cards = [...document.querySelectorAll("[data-capability-card]")];
  const searches = [...document.querySelectorAll("[data-dashboard-search], #capSearch")];
  const originButtons = [...document.querySelectorAll("[data-origin-filter]")];
  const kindSelect = document.querySelector("#kindSel");
  const sortSelect = document.querySelector("#sortSel");
  const resultCount = document.querySelector("#resultCount");
  const emptyRow = document.querySelector("#emptyRow");
  const drawer = document.querySelector("#drawer");
  const backdrop = document.querySelector("#backdrop");
  const drawerContent = document.querySelector("#drawerContent");
  let query = "";
  let origin = "all";

  function showView(id) {
    const viewId = id && id.startsWith("capability-") ? "capabilities" : ["overview", "connect", "capabilities", "upstreams", "tools"].includes(id) ? id : "overview";
    views.forEach((view) => view.classList.toggle("on", view.dataset.view === viewId));
    navLinks.forEach((link) => link.classList.toggle("act", link.dataset.nav === viewId));
  }

  function openDrawer(targetId) {
    const template = document.getElementById("drawer-" + targetId);
    if (!template || !drawer || !drawerContent || !backdrop) return;
    drawerContent.innerHTML = template.innerHTML;
    drawer.classList.add("on");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("on");
    document.body.style.overflow = "hidden";
    drawer.scrollTop = 0;
    drawerContent.querySelector(".d-close")?.addEventListener("click", closeDrawer);
  }

  function closeDrawer() {
    if (!drawer || !backdrop) return;
    drawer.classList.remove("on");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("on");
    document.body.style.overflow = "";
  }

  function syncSearch(value) {
    query = value.trim().toLowerCase();
    searches.forEach((input) => {
      if (input.value !== value) input.value = value;
    });
    filterRows();
  }

  function matches(row) {
    const textMatch = !query || row.dataset.search.toLowerCase().includes(query);
    const originMatch = origin === "all" || row.dataset.origin === origin;
    const kindMatch = !kindSelect || kindSelect.value === "all" || row.dataset.kind === kindSelect.value;
    return textMatch && originMatch && kindMatch;
  }

  function filterRows() {
    const sorted = [...rows].sort((a, b) => {
      if (!sortSelect || sortSelect.value === "name") return a.dataset.name.localeCompare(b.dataset.name);
      if (sortSelect.value === "files") return Number(b.dataset.files) - Number(a.dataset.files);
      return b.dataset.sync.localeCompare(a.dataset.sync);
    });
    const body = document.querySelector("#capRows");
    sorted.forEach((row) => body.append(row));
    let visible = 0;
    rows.forEach((row) => {
      const ok = matches(row);
      row.hidden = !ok;
      visible += ok ? 1 : 0;
    });
    cards.forEach((card) => {
      card.hidden = query ? !card.dataset.search.toLowerCase().includes(query) : false;
    });
    if (emptyRow) emptyRow.hidden = visible !== 0;
    if (resultCount) resultCount.innerHTML = "<b>" + visible + "</b> / ${totalCapabilities} ${escapeHtml(copy.stats.capabilities)}";
  }

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    showView(id);
    if (id.startsWith("capability-")) openDrawer(id);
  });
  navLinks.forEach((link) => link.addEventListener("click", () => showView(link.dataset.nav)));
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-drawer-target]");
    if (!trigger) return;
    event.preventDefault();
    openDrawer(trigger.dataset.drawerTarget);
  });
  rows.forEach((row) => {
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDrawer(row.dataset.drawerTarget);
    });
  });
  backdrop?.addEventListener("click", closeDrawer);
  searches.forEach((input) => input.addEventListener("input", () => syncSearch(input.value)));
  originButtons.forEach((button) => {
    button.addEventListener("click", () => {
      origin = button.dataset.originFilter;
      originButtons.forEach((candidate) => candidate.classList.toggle("act", candidate === button));
      filterRows();
    });
  });
  kindSelect?.addEventListener("change", filterRows);
  sortSelect?.addEventListener("change", filterRows);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    } else if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      searches[0]?.focus();
    }
  });
  showView(location.hash.slice(1));
  if (location.hash.slice(1).startsWith("capability-")) openDrawer(location.hash.slice(1));
  filterRows();
})();
</script>`;
}
