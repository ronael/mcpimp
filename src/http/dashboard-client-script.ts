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
  const activityRows = document.querySelector("#activityRows");
  const activityCopy = ${JSON.stringify({
    empty: copy.activityEmpty,
    error: copy.activityError,
    details: copy.activityHeaders.details,
    labels: copy.activityDetailLabels,
  })};
  const activityDate = new Intl.DateTimeFormat(${JSON.stringify(copy.htmlLang)}, { dateStyle: "short", timeStyle: "medium" });
  const expandedActivity = new Set();
  let query = "";
  let origin = "all";

  function showView(id) {
    const viewId = id && id.startsWith("capability-") ? "capabilities" : ["overview", "connect", "capabilities", "upstreams", "activity", "tools"].includes(id) ? id : "overview";
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

  function activityState(message, isError = false) {
    if (!activityRows) return;
    activityRows.replaceChildren();
    const row = document.createElement("tr");
    row.className = "activity-state" + (isError ? " error" : "");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = message;
    row.append(cell);
    activityRows.append(row);
  }

  function activityCell(value, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = value;
    return cell;
  }

  function activityDetailItem(label, value, wide = false) {
    const item = document.createElement("div");
    if (wide) item.className = "detail-wide";
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    if (value && typeof value === "object") {
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(value, null, 2);
      description.append(pre);
    } else {
      description.textContent = String(value);
    }
    item.append(term, description);
    return item;
  }

  function activityDetails(event) {
    const row = document.createElement("tr");
    row.className = "activity-detail-row";
    row.id = "activity-detail-" + event.id;
    row.hidden = !expandedActivity.has(event.id);
    const cell = document.createElement("td");
    cell.colSpan = 7;
    const list = document.createElement("dl");
    list.className = "activity-detail-grid";
    if (Object.prototype.hasOwnProperty.call(event, "requestId")) {
      list.append(activityDetailItem(activityCopy.labels.requestId, event.requestId));
    }
    if (event.sessionId) list.append(activityDetailItem(activityCopy.labels.sessionId, event.sessionId));
    if (event.parameters) list.append(activityDetailItem(activityCopy.labels.parameters, event.parameters, true));
    if (event.result) list.append(activityDetailItem(activityCopy.labels.result, event.result, true));
    if (event.error) list.append(activityDetailItem(activityCopy.labels.error, event.error, true));
    cell.append(list);
    row.append(cell);
    return row;
  }

  function renderActivity(events) {
    if (!activityRows) return;
    if (!events.length) {
      activityState(activityCopy.empty);
      return;
    }
    activityRows.replaceChildren();
    events.forEach((event) => {
      const row = document.createElement("tr");
      row.append(activityCell(activityDate.format(new Date(event.timestamp))));
      row.append(activityCell(event.client));

      const actionCell = document.createElement("td");
      const action = document.createElement("span");
      action.className = "activity-action";
      const method = document.createElement("strong");
      method.textContent = event.method;
      action.append(method);
      if (event.target) {
        const target = document.createElement("span");
        target.textContent = event.target;
        action.append(target);
      }
      actionCell.append(action);
      row.append(actionCell);
      row.append(activityCell(event.transport, "mono"));

      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = "chip " + (event.status === "success" ? "ok" : "err");
      status.textContent = event.status;
      statusCell.append(status);
      row.append(statusCell);
      row.append(activityCell(event.durationMs + " ms"));

      const toggleCell = document.createElement("td");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "activity-toggle";
      toggle.setAttribute("aria-controls", "activity-detail-" + event.id);
      toggle.setAttribute("aria-expanded", String(expandedActivity.has(event.id)));
      const label = document.createElement("span");
      label.textContent = activityCopy.details;
      const icon = document.createElement("i");
      icon.className = "ph ph-caret-down";
      icon.setAttribute("aria-hidden", "true");
      toggle.append(label, icon);
      toggleCell.append(toggle);
      row.append(toggleCell);

      const detailRow = activityDetails(event);
      toggle.addEventListener("click", () => {
        const isOpen = expandedActivity.has(event.id);
        if (isOpen) expandedActivity.delete(event.id);
        else expandedActivity.add(event.id);
        detailRow.hidden = isOpen;
        toggle.setAttribute("aria-expanded", String(!isOpen));
      });
      activityRows.append(row, detailRow);
    });
  }

  async function refreshActivity() {
    try {
      const response = await fetch("/activity?limit=100", { cache: "no-store" });
      if (!response.ok) throw new Error("activity request failed");
      const payload = await response.json();
      renderActivity(Array.isArray(payload.events) ? payload.events : []);
    } catch {
      activityState(activityCopy.error, true);
    }
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
  refreshActivity();
  window.setInterval(refreshActivity, 3000);
})();
</script>`;
}
