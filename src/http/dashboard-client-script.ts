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
  const activityClientFilter = document.querySelector("#activityClientFilter");
  const activityMethodFilter = document.querySelector("#activityMethodFilter");
  const activityToolFilter = document.querySelector("#activityToolFilter");
  const activityStatusFilter = document.querySelector("#activityStatusFilter");
  const activityPeriodFilter = document.querySelector("#activityPeriodFilter");
  const activityPersistence = document.querySelector("#activityPersistence");
  const activityExportJson = document.querySelector("#activityExportJson");
  const activityExportNdjson = document.querySelector("#activityExportNdjson");
  const upstreamRows = document.querySelector("#upstreamRows");
  const sourceRows = document.querySelector("#sourceRows");
  const activityFilters = [activityClientFilter, activityMethodFilter, activityToolFilter, activityStatusFilter, activityPeriodFilter].filter(Boolean);
  const reviewCopyButtons = [...document.querySelectorAll("[data-review-command]")];
  const activityCopy = ${JSON.stringify({
    empty: copy.activityEmpty,
    filteredEmpty: copy.activityFilteredEmpty,
    error: copy.activityError,
    details: copy.activityHeaders.details,
    labels: copy.activityDetailLabels,
    persistence: {
      "process-memory": copy.activityFilters.processMemory,
      "process-memory+ndjson": copy.activityFilters.persistentNdjson,
    },
  })};
  const activityDate = new Intl.DateTimeFormat(${JSON.stringify(copy.htmlLang)}, { dateStyle: "short", timeStyle: "medium" });
  const reviewCopy = ${JSON.stringify({ idle: copy.reviewCopyCommand, copied: copy.reviewCopied })};
  const noUpstreams = ${JSON.stringify(copy.noUpstreams)};
  const noSources = ${JSON.stringify(copy.sourceHealthEmpty)};
  let drawerTrigger = null;
  let query = "";
  let origin = "all";

  function showView(id) {
    const viewId = id && id.startsWith("capability-") ? "capabilities" : ["overview", "connect", "capabilities", "review", "sources", "upstreams", "activity", "tools"].includes(id) ? id : "overview";
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

  function upstreamChip(text, variant, plain = false) {
    const chip = document.createElement("span");
    chip.className = "chip " + variant + (plain ? " plain" : "");
    chip.textContent = text;
    return chip;
  }

  function upstreamCell() {
    const cell = document.createElement("td");
    const content = document.createElement("div");
    content.className = "upstream-cell";
    cell.append(content);
    return { cell, content };
  }

  function upstreamNote(text, mono = false) {
    const note = document.createElement("span");
    note.className = "upstream-note" + (mono ? " mono" : "");
    note.textContent = text;
    return note;
  }

  function renderUpstreams(upstreams) {
    if (!upstreamRows || !Array.isArray(upstreams)) return;
    upstreamRows.replaceChildren();
    if (upstreams.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = noUpstreams;
      row.append(cell);
      upstreamRows.append(row);
      return;
    }
    upstreams.forEach((upstream) => {
      const row = document.createElement("tr");
      const capability = document.createElement("td");
      capability.className = "mono";
      const link = document.createElement("a");
      link.href = "#capability-" + String(upstream.capabilityId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      link.textContent = upstream.capabilityId;
      capability.append(link);
      row.append(capability);

      const transport = document.createElement("td");
      transport.append(upstreamChip(upstream.transport, "info", true));
      row.append(transport);

      const configuration = upstreamCell();
      configuration.content.append(upstreamChip(
        upstream.status,
        upstream.status === "ready" ? "ok" : upstream.status === "missing-env" ? "warn" : "err",
      ));
      if (upstream.missingEnv?.length) configuration.content.append(upstreamNote(upstream.missingEnv.join(", "), true));
      row.append(configuration.cell);

      const availability = upstreamCell();
      availability.content.append(upstreamChip(
        upstream.reachable === true ? "reachable" : upstream.reachable === false ? "unavailable" : "unchecked",
        upstream.reachable === true ? "ok" : upstream.reachable === false ? "err" : "info",
      ));
      if (upstream.lastError?.message) availability.content.append(upstreamNote(upstream.lastError.message));
      row.append(availability.cell);

      const latency = upstreamCell();
      const duration = document.createElement("strong");
      duration.textContent = Number.isFinite(upstream.latencyMs) ? upstream.latencyMs + " ms" : "—";
      latency.content.append(duration);
      latency.content.append(upstreamNote(
        upstream.lastCheckedAt ? activityDate.format(new Date(upstream.lastCheckedAt)) : ${JSON.stringify(copy.never)},
      ));
      row.append(latency.cell);

      const cache = upstreamCell();
      cache.content.append(upstreamChip(
        upstream.cacheStatus,
        upstream.cacheStatus === "fresh" ? "ok" : upstream.cacheStatus === "stale" ? "warn" : "info",
      ));
      cache.content.append(upstreamNote((upstream.cachedToolCount || 0) + " tools"));
      row.append(cache.cell);

      const endpoint = document.createElement("td");
      endpoint.className = "mono wrap";
      endpoint.textContent = upstream.url;
      row.append(endpoint);
      upstreamRows.append(row);
    });
  }

  async function refreshUpstreams() {
    if (!upstreamRows) return;
    try {
      const response = await fetch("/upstreams", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      renderUpstreams(payload.upstreams);
    } catch {
      // Keep the last known state visible while the local endpoint is unavailable.
    }
  }

  function sourceRevisionLine(label, values) {
    const line = document.createElement("span");
    const prefix = document.createElement("b");
    prefix.textContent = label;
    line.append(prefix);
    if (!Array.isArray(values) || values.length === 0) {
      line.append("—");
      return line;
    }
    values.forEach((value, index) => {
      if (index > 0) line.append(", ");
      const revision = document.createElement("code");
      revision.title = value;
      revision.textContent = value.slice(0, 12);
      line.append(revision);
    });
    return line;
  }

  function renderSources(sources) {
    if (!sourceRows || !Array.isArray(sources)) return;
    sourceRows.replaceChildren();
    if (sources.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = noSources;
      row.append(cell);
      sourceRows.append(row);
      return;
    }
    sources.forEach((source) => {
      const row = document.createElement("tr");
      row.append(activityCell(source.sourceId, "mono"));
      const type = document.createElement("td");
      type.append(upstreamChip(source.sourceType || "unknown", "info", true));
      row.append(type);
      const status = document.createElement("td");
      status.append(upstreamChip(
        source.status,
        source.status === "healthy" ? "ok" : source.status === "pending" ? "warn" : source.status === "error" ? "err" : "info",
      ));
      row.append(status);
      row.append(activityCell(source.lastCheckedAt ? activityDate.format(new Date(source.lastCheckedAt)) : ${JSON.stringify(copy.never)}));
      row.append(activityCell(source.lastSyncedAt ? activityDate.format(new Date(source.lastSyncedAt)) : ${JSON.stringify(copy.never)}));

      const revisions = document.createElement("td");
      const revisionList = document.createElement("div");
      revisionList.className = "source-revisions";
      revisionList.append(sourceRevisionLine("L", source.localRevisions));
      revisionList.append(sourceRevisionLine("A", source.availableRevisions));
      revisions.append(revisionList);
      row.append(revisions);

      const outcome = upstreamCell();
      if (source.errors?.length) {
        source.errors.forEach((error) => outcome.content.append(upstreamNote(error)));
      } else if (source.pending?.total) {
        const total = document.createElement("strong");
        total.textContent = String(source.pending.total);
        outcome.content.append(total);
        outcome.content.append(upstreamNote(
          "+" + source.pending.new + " ~" + source.pending.updates + " -" + source.pending.removals + " r" + source.pending.renames,
        ));
      } else {
        outcome.content.append("—");
      }
      row.append(outcome.cell);
      sourceRows.append(row);
    });
  }

  async function refreshSources() {
    if (!sourceRows) return;
    try {
      const response = await fetch("/sources", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      renderSources(payload.sources);
    } catch {
      // Keep the last persisted snapshot visible during a local restart.
    }
  }

  function activityCell(value, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = value;
    return cell;
  }

  function syncActivityFacet(select, values) {
    if (!select) return;
    const previous = select.value;
    const first = select.options[0];
    select.replaceChildren(first);
    const options = previous && !values.includes(previous) ? [previous, ...values] : values;
    options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
    select.value = previous;
  }

  function buildActivityQuery() {
    const params = new URLSearchParams({ limit: "100" });
    if (activityClientFilter?.value) params.set("client", activityClientFilter.value);
    if (activityMethodFilter?.value) params.set("method", activityMethodFilter.value);
    if (activityToolFilter?.value) params.set("tool", activityToolFilter.value);
    if (activityStatusFilter?.value) params.set("status", activityStatusFilter.value);
    if (activityPeriodFilter?.value) {
      const minutes = Number(activityPeriodFilter.value);
      params.set("from", new Date(Date.now() - minutes * 60 * 1000).toISOString());
    }
    return params;
  }

  function updateActivityExports(params) {
    [[activityExportJson, "json"], [activityExportNdjson, "ndjson"]].forEach(([link, format]) => {
      if (!link) return;
      const exportParams = new URLSearchParams(params);
      exportParams.set("format", format);
      exportParams.set("download", "1");
      link.href = "/activity?" + exportParams.toString();
    });
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
    if (event.correlationId) list.append(activityDetailItem(activityCopy.labels.correlationId, event.correlationId));
    if (Object.prototype.hasOwnProperty.call(event, "requestId")) {
      list.append(activityDetailItem(activityCopy.labels.requestId, event.requestId));
    }
    if (event.sessionId) list.append(activityDetailItem(activityCopy.labels.sessionId, event.sessionId));
    if (event.upstream) list.append(activityDetailItem(activityCopy.labels.upstream, event.upstream));
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
      activityState(activityFilters.some((control) => control.value) ? activityCopy.filteredEmpty : activityCopy.empty);
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
      const query = buildActivityQuery();
      updateActivityExports(query);
      const response = await fetch("/activity?" + query.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error("activity request failed");
      const payload = await response.json();
      const facets = payload.facets || {};
      syncActivityFacet(activityClientFilter, Array.isArray(facets.clients) ? facets.clients : []);
      syncActivityFacet(activityMethodFilter, Array.isArray(facets.methods) ? facets.methods : []);
      syncActivityFacet(activityToolFilter, Array.isArray(facets.tools) ? facets.tools : []);
      if (activityPersistence) {
        activityPersistence.textContent = activityCopy.persistence[payload.persistence] || payload.persistence || "";
      }
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
  reviewCopyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const command = button.dataset.reviewCommand;
      if (!command) return;
      try {
        await navigator.clipboard.writeText(command);
        const label = button.querySelector("span");
        if (label) label.textContent = reviewCopy.copied;
        window.setTimeout(() => {
          if (label) label.textContent = reviewCopy.idle;
        }, 1600);
      } catch {
        button.setAttribute("title", command);
      }
    });
  });
  activityFilters.forEach((control) => control.addEventListener("change", refreshActivity));
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
  refreshUpstreams();
  refreshSources();
  window.setInterval(refreshActivity, 3000);
  window.setInterval(refreshUpstreams, 5000);
  window.setInterval(refreshSources, 5000);
})();
</script>`;
}
