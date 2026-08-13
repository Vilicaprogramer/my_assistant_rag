// ==========================================
// ESTADO GLOBAL & CONFIGURACIÓN (AURA RAG)
// ==========================================
let currentSessionId = "";
let sessions = {};
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutos

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    loadSessions();
    setupEventListeners();
    checkInactivityAndInitialize();
    setupActivityTracker();
});

function generateId() {
    return "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

function loadSessions() {
    const stored = localStorage.getItem("aura_sessions");
    if (stored) {
        try { sessions = JSON.parse(stored); } catch (e) { sessions = {}; }
    }
}

function saveSessions() {
    localStorage.setItem("aura_sessions", JSON.stringify(sessions));
    localStorage.setItem("aura_last_session", currentSessionId);
}

// ==========================================
// LÓGICA DE INACTIVIDAD (30 MINUTOS)
// ==========================================
function checkInactivityAndInitialize() {
    const lastActivity = localStorage.getItem("aura_last_activity");
    const now = Date.now();

    if (lastActivity && (now - parseInt(lastActivity, 10)) > INACTIVITY_TIMEOUT_MS) {
        // Superado el tiempo de inactividad: crear nuevo chat limpio
        createNewChat();
        showToast("Sesión reiniciada por inactividad (30 min)", "info");
    } else {
        // Cargar última sesión activa
        const lastSession = localStorage.getItem("aura_last_session");
        if (lastSession && sessions[lastSession]) {
            selectSession(lastSession);
        } else {
            createNewChat();
        }
    }
    updateActivityTimestamp();
}

function updateActivityTimestamp() {
    localStorage.setItem("aura_last_activity", Date.now().toString());
}

function setupActivityTracker() {
    ["click", "keydown", "mousemove", "scroll"].forEach(eventType => {
        window.addEventListener(eventType, throttle(updateActivityTimestamp, 5000));
    });
}

function throttle(func, limit) {
    let inThrottle;
    return function () {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================
// EVENT LISTENERS & SIDEBAR RESPONSIVE
// ==========================================
function setupEventListeners() {
    document.getElementById("chat-form").addEventListener("submit", handleFormSubmit);
    document.getElementById("btn-new-chat").addEventListener("click", () => {
        createNewChat();
        closeSidebarMobile();
    });
    document.getElementById("btn-clear").addEventListener("click", clearCurrentChat);
    document.getElementById("close-references").addEventListener("click", () => {
        document.getElementById("references-panel").classList.remove("open");
    });

    // Control Sidebar
    const btnToggle = document.getElementById("btn-toggle-sidebar");
    const btnCloseMobile = document.getElementById("btn-close-sidebar-mobile");
    const overlay = document.getElementById("sidebar-overlay");

    btnToggle.addEventListener("click", toggleSidebar);
    if (btnCloseMobile) btnCloseMobile.addEventListener("click", closeSidebarMobile);
    if (overlay) overlay.addEventListener("click", closeSidebarMobile);
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle("mobile-open");
        overlay.classList.toggle("active");
    } else {
        sidebar.classList.toggle("collapsed");
    }
}

function closeSidebarMobile() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("active");
}

// ==========================================
// MANEJADORES DE CHAT
// ==========================================
function createNewChat() {
    const newId = generateId();
    sessions[newId] = [];
    currentSessionId = newId;
    saveSessions();
    renderSessionsList();
    selectSession(newId);
}

function selectSession(sessionId) {
    currentSessionId = sessionId;
    saveSessions();

    document.querySelectorAll(".history-item").forEach(item => {
        item.classList.toggle("active", item.dataset.id === sessionId);
    });

    const container = document.getElementById("messages-container");
    container.innerHTML = "";

    const msgs = sessions[sessionId] || [];
    if (msgs.length === 0) {
        showWelcomeScreen(true);
    } else {
        showWelcomeScreen(false);
        msgs.forEach(msg => appendMessageUI(msg.text, msg.sender, msg.sources));
    }

    document.getElementById("references-panel").classList.remove("open");
}

function showWelcomeScreen(show) {
    let welcome = document.getElementById("welcome-message");
    if (show) {
        if (!welcome) {
            welcome = document.createElement("div");
            welcome.className = "welcome-message";
            welcome.id = "welcome-message";
            welcome.innerHTML = `
                <div class="welcome-icon"><i class="fa-solid fa-folder-open"></i></div>
                <h1>Hola, soy Aura</h1>
                <p>Puedo ayudarte a extraer conocimiento y responder preguntas sobre tus documentos.</p>
            `;
            document.getElementById("messages-container").appendChild(welcome);
        }
        welcome.style.display = "flex";
    } else if (welcome) {
        welcome.style.display = "none";
    }
}

function clearCurrentChat() {
    if (currentSessionId && sessions[currentSessionId]) {
        sessions[currentSessionId] = [];
        saveSessions();
        selectSession(currentSessionId);
        showToast("Conversación limpiada", "success");
    }
}

function deleteSession(sessionId, event) {
    event.stopPropagation();
    delete sessions[sessionId];
    saveSessions();
    renderSessionsList();

    if (currentSessionId === sessionId) {
        const keys = Object.keys(sessions);
        if (keys.length > 0) selectSession(keys[0]);
        else createNewChat();
    }
    showToast("Conversación eliminada", "success");
}

function renderSessionsList() {
    const list = document.getElementById("history-list");
    list.innerHTML = "";

    Object.keys(sessions).reverse().forEach(id => {
        const msgs = sessions[id];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].text : "Chat vacío";

        const item = document.createElement("div");
        item.className = `history-item ${id === currentSessionId ? "active" : ""}`;
        item.dataset.id = id;
        item.innerHTML = `
            <span>${lastMsg}</span>
            <i class="fa-solid fa-trash delete-session-btn"></i>
        `;
        item.addEventListener("click", () => {
            selectSession(id);
            closeSidebarMobile();
        });
        item.querySelector(".delete-session-btn").addEventListener("click", (e) => deleteSession(id, e));

        list.appendChild(item);
    });
}

// ==========================================
// RENDERIZADO DE MENSAJES Y ENLACES PDF
// ==========================================
function appendMessageUI(text, sender, sources = []) {
    showWelcomeScreen(false);
    const container = document.getElementById("messages-container");
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    const formattedText = (sender === "assistant" && typeof marked !== "undefined")
        ? marked.parse(text)
        : text;

    let sourcesHTML = "";
    if (sender === "assistant" && sources && sources.length > 0) {
        sourcesHTML = `<div class="message-sources">`;
        sources.forEach((src) => {
            // Genera enlace con salto directo a la página del PDF (#page=X)
            const pdfUrl = `/docs/${encodeURIComponent(src.source)}#page=${src.page}`;
            sourcesHTML += `
                <a href="${pdfUrl}" target="_blank" class="source-badge" title="Abrir documento en página ${src.page}">
                    <i class="fa-solid fa-file-pdf"></i> ${src.source} (Pág. ${src.page})
                </a>`;
        });
        sourcesHTML += `</div>`;
    }

    row.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${formattedText}</div>
            ${sourcesHTML}
        </div>
    `;

    if (sender === "assistant" && sources && sources.length > 0) {
        row.querySelectorAll(".source-badge").forEach(badge => {
            badge.addEventListener("click", (e) => {
                // Al hacer clic abre el PDF en nueva pestaña y actualiza el panel lateral de referencias
                showReferences(sources);
            });
        });
    }

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    updateActivityTimestamp();
    const input = document.getElementById("user-input");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendMessageUI(text, "user");

    sessions[currentSessionId].push({ text: text, sender: "user", sources: [] });
    saveSessions();
    renderSessionsList();

    const typingIndicator = showTypingIndicator();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, session_id: currentSessionId })
        });
        const data = await response.json();
        removeTypingIndicator(typingIndicator);

        if (data.status === "success") {
            appendMessageUI(data.response, "assistant", data.sources);
            sessions[currentSessionId].push({
                text: data.response,
                sender: "assistant",
                sources: data.sources
            });
            saveSessions();
            renderSessionsList();
        } else {
            appendMessageUI(`Error: ${data.message}`, "assistant");
        }
    } catch (err) {
        removeTypingIndicator(typingIndicator);
        appendMessageUI("Lo siento, ocurrió un error al conectar con el servidor.", "assistant");
    }
}

function showReferences(sources) {
    const panel = document.getElementById("references-panel");
    const content = document.getElementById("references-content");
    content.innerHTML = "";

    if (!sources || sources.length === 0) {
        panel.classList.remove("open");
        return;
    }

    sources.forEach(src => {
        const pdfUrl = `/docs/${encodeURIComponent(src.source)}#page=${src.page}`;
        const card = document.createElement("div");
        card.className = "ref-card";
        card.innerHTML = `
            <div class="ref-card-header">
                <i class="fa-solid fa-file-pdf"></i>
                <span>${src.source}</span>
            </div>
            <div class="ref-card-body">
                Fragmento extraído de la página <strong>${src.page}</strong>.
            </div>
            <a href="${pdfUrl}" target="_blank" class="ref-pdf-link">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir PDF en página ${src.page}
            </a>
        `;
        content.appendChild(card);
    });

    panel.classList.add("open");
}

function showTypingIndicator() {
    const container = document.getElementById("messages-container");
    const row = document.createElement("div");
    row.className = "message-row assistant typing-indicator-row";
    row.innerHTML = `
        <div class="message-bubble">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return row;
}

function removeTypingIndicator(element) {
    if (element && element.parentNode) element.parentNode.removeChild(element);
}

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}