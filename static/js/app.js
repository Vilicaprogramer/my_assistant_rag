// ==========================================
// ESTADO GLOBAL & CONFIGURACIÓN (AURA RAG)
// ==========================================
let currentSessionId = "";
let sessions = {};

// Inicializacion al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    loadSessions();
    setupEventListeners();
    
    // Iniciar con sesion activa o crear una nueva
    const lastSession = localStorage.getItem("aura_last_session");
    if (lastSession && sessions[lastSession]) {
        selectSession(lastSession);
    } else {
        createNewChat();
    }
});

function generateId() {
    return "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

function loadSessions() {
    const stored = localStorage.getItem("aura_sessions");
    if (stored) {
        try {
            sessions = JSON.parse(stored);
        } catch (e) {
            sessions = {};
        }
    }
}

function saveSessions() {
    localStorage.setItem("aura_sessions", JSON.stringify(sessions));
    localStorage.setItem("aura_last_session", currentSessionId);
}

// ==========================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    document.getElementById("chat-form").addEventListener("submit", handleFormSubmit);
    document.getElementById("btn-new-chat").addEventListener("click", createNewChat);
    document.getElementById("btn-clear").addEventListener("click", clearCurrentChat);
    document.getElementById("close-references").addEventListener("click", () => {
        document.getElementById("references-panel").classList.remove("open");
    });
}

// ==========================================
// MANEJADORES DE UI & CHAT
// ==========================================
function createNewChat() {
    const newId = generateId();
    sessions[newId] = [];
    currentSessionId = newId;
    saveSessions();
    renderSessionsList();
    selectSession(newId);
    showWelcomeScreen(true);
}

function selectSession(sessionId) {
    currentSessionId = sessionId;
    saveSessions();
    
    // Cambiar estado activo en barra lateral
    document.querySelectorAll(".history-item").forEach(item => {
        item.classList.toggle("active", item.dataset.id === sessionId);
    });
    
    // Re-renderizar mensajes
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
                <div class="welcome-icon">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <h1>Hola, soy Aura</h1>
                <p>Puedo ayudarte a extraer conocimiento y responder preguntas sobre los documentos que guardes en la carpeta local <code>/docs</code>.</p>
                <div class="welcome-steps">
                    <div class="step-card">
                        <div class="step-number">1</div>
                        <p>Copia archivos (.pdf, .txt o .md) en la carpeta <code>/docs</code>.</p>
                    </div>
                    <div class="step-card">
                        <div class="step-number">2</div>
                        <p>Haz clic en "Indexar /docs" en la barra lateral para procesarlos.</p>
                    </div>
                    <div class="step-card">
                        <div class="step-number">3</div>
                        <p>¡Comienza a hacer preguntas sobre tu contenido!</p>
                    </div>
                </div>
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
    
    // Si borramos la activa, cambiamos a otra o creamos nueva
    if (currentSessionId === sessionId) {
        const keys = Object.keys(sessions);
        if (keys.length > 0) {
            selectSession(keys[0]);
        } else {
            createNewChat();
        }
    }
    showToast("Conversación eliminada", "success");
}

// ==========================================
// RENDERIZADO DE ELEMENTOS EN EL DOM
// ==========================================
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
        item.addEventListener("click", () => selectSession(id));
        item.querySelector(".delete-session-btn").addEventListener("click", (e) => deleteSession(id, e));
        
        list.appendChild(item);
    });
}

function appendMessageUI(text, sender, sources = []) {
    showWelcomeScreen(false);
    const container = document.getElementById("messages-container");
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;
    
    let sourcesHTML = "";
    if (sender === "assistant" && sources && sources.length > 0) {
        sourcesHTML = `<div class="message-sources">`;
        sources.forEach((src, idx) => {
            sourcesHTML += `
                <span class="source-badge" data-index="${idx}">
                    <i class="fa-solid fa-file-invoice"></i> ${src.source} (Pág. ${src.page})
                </span>`;
        });
        sourcesHTML += `</div>`;
    }
    
    row.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${text}</div>
            ${sourcesHTML}
        </div>
    `;
    
    // Configurar listeners de clicks en las fuentes
    if (sender === "assistant" && sources && sources.length > 0) {
        row.querySelectorAll(".source-badge").forEach(badge => {
            badge.addEventListener("click", () => showReferences(sources));
        });
    }
    
    // Ocultar panel de referencias si no hay fuentes
    if (sender === "assistant" && (!sources || sources.length === 0)) {
        const panel = document.getElementById("references-panel");
        if (panel) {
            panel.classList.remove("open");
            const content = document.getElementById("references-content");
            if (content) content.innerHTML = "";
        }
    }
    
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}

// ==========================================
// LLAMADAS A LA API DEL SERVIDOR FLASK
// ==========================================
async function handleFormSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("user-input");
    const text = input.value.trim();
    if (!text) return;
    
    input.value = "";
    appendMessageUI(text, "user");
    
    // Guardar en estado local
    sessions[currentSessionId].push({ text: text, sender: "user", sources: [] });
    saveSessions();
    renderSessionsList();
    
    // Mostrar indicador de escritura
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
            if (!data.sources || data.sources.length === 0) {
                document.getElementById("references-panel").classList.remove("open");
            }
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

// ==========================================
// PANEL DE REFERENCIAS & COMPONENTES EXTRA
// ==========================================
function showReferences(sources) {
    const panel = document.getElementById("references-panel");
    const content = document.getElementById("references-content");
    content.innerHTML = "";
    
    if (!sources || sources.length === 0) {
        panel.classList.remove("open");
        return;
    }
    
    sources.forEach(src => {
        const card = document.createElement("div");
        card.className = "ref-card";
        card.innerHTML = `
            <div class="ref-card-header">
                <i class="fa-solid fa-file-lines"></i>
                <span>${src.source}</span>
            </div>
            <div class="ref-card-body">
                Este fragmento de respuesta se basa en la página <strong>${src.page}</strong> del documento original.
            </div>
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
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
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
