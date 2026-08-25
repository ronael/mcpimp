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
  let drawerTrigger = null;
  let query = "";
  let origin = "all";

  function showView(id) {
    const viewId = id && id.startsWith("capability-") ? "capabilities" : ["overview", "connect", "capabilities", "upstreams", "activity", "tools"].includes(id) ? id : "overview";
    views.forEach((view) => view.classList.toggle("on", view.dataset.view === viewId));
    navLinks.forEach((link) => link.classList.toggle("act", link.dataset.nav === viewId));
  }

  function showDrawer(trigger) {
    if (!drawer || !drawerContent || !backdrop) return;
    drawerTrigger = trigger || null;
    drawer.classList.add("on");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("on");
    document.body.style.overflow = "hidden";
    drawer.scrollTop = 0;
    const close = drawerContent.querySelector(".d-close");
    close?.addEventListener("click", closeDrawer);
    close?.focus();
  }

  function openDrawer(targetId, trigger) {
    const template = document.getElementById("drawer-" + targetId);
    if (!template || !drawer || !drawerContent || !backdrop) return;
    delete drawerContent.dataset.activityId;
    drawerContent.innerHTML = template.innerHTML;
    showDrawer(trigger);
  }

  function closeDrawer() {
    if (!drawer || !backdrop) return;
    drawer.classList.remove("on");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("on");
    document.body.style.overflow = "";
    drawerTrigger?.focus();
    drawerTrigger = null;
    if (drawerContent) delete drawerContent.dataset.activityId;
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

  function openActivityDrawer(event, trigger) {
    if (!drawerContent) return;
    drawerContent.replaceChildren();
    drawerContent.dataset.activityId = event.id;

    const top = document.createElement("div");
    top.className = "d-top";
    const eventId = document.createElement("span");
    eventId.className = "d-id";
    eventId.textContent = activityDate.format(new Date(event.timestamp)) + " · " + event.id;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "d-close";
    close.setAttribute("aria-label", ${JSON.stringify(copy.close)});
    const closeIcon = document.createElement("i");
    closeIcon.className = "ph ph-x";
    closeIcon.setAttribute("aria-hidden", "true");
    close.append(closeIcon);
    top.append(eventId, close);

    const title = document.createElement("div");
    title.className = "d-title";
    title.textContent = event.method;
    const chips = document.createElement("div");
    chips.className = "d-chips";
    [[event.status, event.status === "success" ? "ok" : "err"], [event.transport, "info"]].forEach(([text, variant]) => {
      const chip = document.createElement("span");
      chip.className = "chip plain " + variant;
      chip.textContent = text;
      chips.append(chip);
    });
    const description = document.createElement("p");
    description.className = "d-desc";
    description.textContent = event.target || event.client;

    const summarySection = document.createElement("div");
    summarySection.className = "d-sec";
    const summaryTitle = document.createElement("div");
    summaryTitle.className = "cs-h";
    summaryTitle.textContent = activityCopy.details;
    const list = document.createElement("dl");
    list.className = "activity-detail-grid";
    list.append(activityDetailItem(${JSON.stringify(copy.activityHeaders.client)}, event.client));
    list.append(activityDetailItem(${JSON.stringify(copy.activityHeaders.duration)}, event.durationMs + " ms"));
    if (Object.prototype.hasOwnProperty.call(event, "requestId")) {
      list.append(activityDetailItem(activityCopy.labels.requestId, event.requestId));
    }
    if (event.sessionId) list.append(activityDetailItem(activityCopy.labels.sessionId, event.sessionId));
    summarySection.append(summaryTitle, list);

    const payloadSection = document.createElement("div");
    payloadSection.className = "d-sec activity-payload";
    if (event.parameters || event.result || event.error) {
      const payloadTitle = document.createElement("div");
      payloadTitle.className = "cs-h";
      payloadTitle.textContent = ${JSON.stringify(copy.activityPayloadTitle)};
      const payloadList = document.createElement("dl");
      payloadList.className = "activity-detail-grid single";
      if (event.parameters) payloadList.append(activityDetailItem(activityCopy.labels.parameters, event.parameters, true));
      if (event.result) payloadList.append(activityDetailItem(activityCopy.labels.result, event.result, true));
      if (event.error) payloadList.append(activityDetailItem(activityCopy.labels.error, event.error, true));
      payloadSection.append(payloadTitle, payloadList);
    }

    drawerContent.append(top, title, chips, description, summarySection);
    if (payloadSection.childElementCount) drawerContent.append(payloadSection);
    showDrawer(trigger);
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
      row.className = "activity-row";
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", activityCopy.details + ": " + event.method + (event.target ? " · " + event.target : ""));
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
      const label = document.createElement("span");
      label.textContent = activityCopy.details;
      const icon = document.createElement("i");
      icon.className = "ph ph-arrow-right";
      icon.setAttribute("aria-hidden", "true");
      toggle.append(label, icon);
      toggleCell.append(toggle);
      row.append(toggleCell);
      toggle.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        openActivityDrawer(event, toggle);
      });
      row.addEventListener("click", () => openActivityDrawer(event, row));
      row.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.target !== row) return;
        if (keyEvent.key !== "Enter" && keyEvent.key !== " ") return;
        keyEvent.preventDefault();
        openActivityDrawer(event, row);
      });
      activityRows.append(row);
    });
  }

  async function refreshActivity() {
    if (drawer?.classList.contains("on") && drawerContent?.dataset.activityId) return;
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
    openDrawer(trigger.dataset.drawerTarget, trigger);
  });
  rows.forEach((row) => {
    row.addEventListener("keydown", (event) => {
      if (event.target !== row) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDrawer(row.dataset.drawerTarget, row);
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
