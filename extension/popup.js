// Crow Extension - Popup Script
const CROW_URL = "http://127.0.0.1:3000";

let currentCookies = [];
let currentUrl = "";
let tenants = [];

// DOM Elements
const loadingEl = document.getElementById("loading");
const loginRequiredEl = document.getElementById("login-required");
const mainContentEl = document.getElementById("main-content");
const currentUrlEl = document.getElementById("current-url");
const cookieCountEl = document.getElementById("cookie-count");
const tenantSelectEl = document.getElementById("tenant-select");
const manageTenantSelectEl = document.getElementById("manage-tenant-select");
const sessionNameEl = document.getElementById("session-name");
const expiresInEl = document.getElementById("expires-in");
const captureBtnEl = document.getElementById("capture-btn");
const captureStatusEl = document.getElementById("capture-status");
const sessionsListEl = document.getElementById("sessions-list");
const manageStatusEl = document.getElementById("manage-status");

// Initialize
async function init() {
  // Setup tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Setup open crow button
  document.getElementById("open-crow-btn")?.addEventListener("click", openCrow);

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    currentUrl = new URL(tab.url).hostname;
    currentUrlEl.textContent = currentUrl;

    // Get cookies for this domain
    const cookies = await chrome.cookies.getAll({ domain: currentUrl });
    currentCookies = cookies;
    cookieCountEl.textContent = `${cookies.length} cookies found`;

    // Auto-suggest session name
    sessionNameEl.value = `${currentUrl} Session`;
  }

  // Check auth and load tenants
  await loadTenants();

  // Setup event listeners
  tenantSelectEl.addEventListener("change", updateCaptureButton);
  sessionNameEl.addEventListener("input", updateCaptureButton);
  captureBtnEl.addEventListener("click", captureSession);
  manageTenantSelectEl.addEventListener("change", loadSessions);
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
}

async function loadTenants() {
  try {
    const response = await fetch(`${CROW_URL}/api/extension/tenants`, {
      credentials: "include",
    });

    if (response.status === 401) {
      showLoginRequired();
      return;
    }

    if (!response.ok) throw new Error("Failed to load tenants");

    const data = await response.json();
    tenants = data.tenants || [];

    // Populate dropdowns
    const options = tenants.map(
      (t) => `<option value="${t.id}">${t.name}</option>`,
    );
    tenantSelectEl.innerHTML =
      '<option value="">Select a client...</option>' + options.join("");
    manageTenantSelectEl.innerHTML =
      '<option value="">Select a client...</option>' + options.join("");

    showMainContent();
  } catch (error) {
    console.error("Error loading tenants:", error);
    showLoginRequired();
  }
}

function showLoginRequired() {
  loadingEl.classList.add("hidden");
  loginRequiredEl.classList.remove("hidden");
  mainContentEl.classList.add("hidden");
}

function showMainContent() {
  loadingEl.classList.add("hidden");
  loginRequiredEl.classList.add("hidden");
  mainContentEl.classList.remove("hidden");
}

function updateCaptureButton() {
  const tenantId = tenantSelectEl.value;
  const sessionName = sessionNameEl.value.trim();
  captureBtnEl.disabled =
    !tenantId || !sessionName || currentCookies.length === 0;
}

async function captureSession() {
  const tenantId = tenantSelectEl.value;
  const sessionName = sessionNameEl.value.trim();
  const expiresInHours = parseInt(expiresInEl.value);

  if (!tenantId || !sessionName) return;

  captureBtnEl.disabled = true;
  captureBtnEl.textContent = "Saving...";
  showStatus(captureStatusEl, "Encrypting and saving...", "loading");

  // Format cookies as Cookie header string
  const cookieString = currentCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Calculate expiry
  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000,
  ).toISOString();

  try {
    const response = await fetch(`${CROW_URL}/api/extension/sessions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        name: sessionName,
        cookieData: cookieString,
        expiresAt,
        domain: currentUrl,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to save");
    }

    showStatus(captureStatusEl, "✓ Session saved successfully!", "success");
    sessionNameEl.value = "";
  } catch (error) {
    showStatus(captureStatusEl, `✗ ${error.message}`, "error");
  } finally {
    captureBtnEl.disabled = false;
    captureBtnEl.textContent = "Capture & Save Session";
    updateCaptureButton();
  }
}

async function loadSessions() {
  const tenantId = manageTenantSelectEl.value;
  if (!tenantId) {
    sessionsListEl.innerHTML =
      '<div class="status loading">Select a client to view sessions</div>';
    return;
  }

  sessionsListEl.innerHTML =
    '<div class="status loading">Loading sessions...</div>';

  try {
    const response = await fetch(
      `${CROW_URL}/api/extension/sessions?tenantId=${tenantId}`,
      { credentials: "include" },
    );

    if (!response.ok) throw new Error("Failed to load sessions");

    const data = await response.json();
    const sessions = data.sessions || [];

    if (sessions.length === 0) {
      sessionsListEl.innerHTML =
        '<div class="status">No sessions for this client</div>';
      return;
    }

    sessionsListEl.innerHTML = sessions
      .map((s) => {
        const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
        const statusClass = isExpired ? "expired" : "active";
        const statusText = isExpired ? "Expired" : "Active";

        return `
          <div class="session-item" data-id="${s.id}">
            <div class="session-info">
              <div class="session-name">${escapeHtml(s.name)}</div>
              <div class="session-status ${statusClass}">${statusText}</div>
            </div>
            <div class="session-actions">
              <button class="secondary refresh-btn" data-session-id="${s.id}">Refresh</button>
              <button class="danger delete-btn" data-session-id="${s.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Add event listeners for buttons
    sessionsListEl.querySelectorAll(".refresh-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        refreshSession(btn.dataset.sessionId),
      );
    });
    sessionsListEl.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteSession(btn.dataset.sessionId));
    });
  } catch (error) {
    sessionsListEl.innerHTML = `<div class="status error">Error: ${error.message}</div>`;
  }
}

async function refreshSession(sessionId) {
  if (currentCookies.length === 0) {
    showStatus(
      manageStatusEl,
      "No cookies on current page to refresh with",
      "error",
    );
    return;
  }

  showStatus(manageStatusEl, "Refreshing session...", "loading");

  const cookieString = currentCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const response = await fetch(
      `${CROW_URL}/api/extension/sessions/${sessionId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookieData: cookieString,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      },
    );

    if (!response.ok) throw new Error("Failed to refresh");

    showStatus(manageStatusEl, "✓ Session refreshed!", "success");
    loadSessions();
  } catch (error) {
    showStatus(manageStatusEl, `✗ ${error.message}`, "error");
  }
}

async function deleteSession(sessionId) {
  if (!confirm("Delete this session?")) return;

  showStatus(manageStatusEl, "Deleting...", "loading");

  try {
    const response = await fetch(
      `${CROW_URL}/api/extension/sessions/${sessionId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!response.ok) throw new Error("Failed to delete");

    showStatus(manageStatusEl, "✓ Session deleted", "success");
    loadSessions();
  } catch (error) {
    showStatus(manageStatusEl, `✗ ${error.message}`, "error");
  }
}

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove("hidden");

  if (type === "success" || type === "error") {
    setTimeout(() => el.classList.add("hidden"), 3000);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function openCrow() {
  chrome.tabs.create({ url: `${CROW_URL}/login` });
}

// Start
init();
