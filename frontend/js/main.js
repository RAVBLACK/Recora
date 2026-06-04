let isChatOpen = true;
let isMenuOpen = false;
let hrAssistant;

document.addEventListener("DOMContentLoaded", async () => {
    await HRConfig.init();
    hrAssistant = new HRAssistantAgent({
        candidateAgent: HRCandidateAgent,
        jobAgent: HRJobAgent,
        analyticsAgent: HRAnalyticsAgent,
        dataStore: HRDataStore,
        config: HRConfig
    });
    initLayout();
    renderChatHistory();
});

function initLayout() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const navItems = [
        ["dashboard.html", "Dashboard"],
        ["upload.html", "Upload"],
        ["candidates.html", "Candidates"],
        ["jobs.html", "Jobs"],
        ["evaluation.html", "Evaluation"],
        ["schedule.html", "Schedule"],
        ["analytics.html", "Analytics"]
    ];
    const currentLabel = navItems.find(([href]) => href === currentPage)?.[1] || "Home";
    const prompts = [
        "Find top Python developers",
        "Rank candidates",
        "Generate interview questions",
        "Summarize latest resume",
        "Create backend developer JD",
        "Schedule interview"
    ];

    const topbarHTML = `
        <header class="app-topbar">
            <div class="topbar-brand">
                <button type="button" class="hamburger-button" onclick="toggleMenu()" aria-label="Open menu">
                    <span class="hamburger-lines"></span>
                </button>
                <img src="assets/recordlogo.png" alt="Recora Logo" style="height: 32px; width: auto; object-fit: contain; margin-left: 8px;">
                <span class="topbar-title">Recora</span>
            </div>
        </header>
    `;

    const sidebarHTML = `
        <div id="sidebar-overlay" class="sidebar-overlay hidden" onclick="closeMenu()"></div>
        <aside id="app-sidebar" class="app-sidebar">
            <a href="index.html" class="brand-block" aria-label="Recora home">
                <img src="assets/recordlogo.png" alt="Recora Logo" style="width: 2.25rem; height: 2.25rem; object-fit: contain;">
                <span>
                    <span class="brand-title">Recora</span>
                    <span class="brand-subtitle">HR Platform</span>
                </span>
                <button type="button" class="sidebar-close" onclick="closeMenu()" aria-label="Close menu">X</button>
            </a>
            <nav class="sidebar-nav">
                ${navItems.map(([href, label]) => `
                    <a href="${href}" class="${href === currentPage ? "active" : ""}">${label}</a>
                `).join("")}
            </nav>
        </aside>
    `;

    const chatbotHTML = `
        <section id="ai-chat-panel" class="chat-panel" aria-label="Recora Assistant">
            <header class="chat-header">
                <div>
                    <div class="chat-title">Recora Assistant</div>
                    <div class="chat-subtitle">Your recruitment platform</div>
                </div>
                <div class="chat-header-actions">
                    <button type="button" class="icon-button" onclick="clearChat()" title="Clear chat" aria-label="Clear chat">
                        <span>Clear</span>
                    </button>
                    <button type="button" class="icon-button" onclick="toggleChat()" title="Close chat" aria-label="Close chat">
                        <span>X</span>
                    </button>
                </div>
            </header>

            <div id="chat-history" class="chat-history"></div>

            <div class="prompt-suggestions" id="prompt-suggestions">
                ${prompts.map((prompt) => `<button type="button" onclick="runQuickAction('${escapeAttribute(prompt)}')">${prompt}</button>`).join("")}
            </div>

            <form class="chat-composer" onsubmit="event.preventDefault(); sendMessage();">
                <input type="text" id="chat-input" placeholder="Ask about candidates, resumes, jobs, interviews..." autocomplete="off">
                <button type="submit" aria-label="Send message">Send</button>
            </form>
        </section>

        <button id="chat-toggle-btn" onclick="toggleChat()" class="chat-toggle hidden" aria-label="Open HR Assistant">
            AI
        </button>
    `;

    document.body.insertAdjacentHTML("afterbegin", sidebarHTML);
    document.body.insertAdjacentHTML("afterbegin", topbarHTML);
    document.body.insertAdjacentHTML("beforeend", chatbotHTML);

    const mainContent = document.getElementById("main-content");
    if (mainContent) {
        mainContent.classList.add("app-main");
    }
}

function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    document.getElementById("app-sidebar")?.classList.toggle("open", isMenuOpen);
    document.getElementById("sidebar-overlay")?.classList.toggle("hidden", !isMenuOpen);
}

function closeMenu() {
    isMenuOpen = false;
    document.getElementById("app-sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.add("hidden");
}

function toggleChat() {
    const panel = document.getElementById("ai-chat-panel");
    const toggleBtn = document.getElementById("chat-toggle-btn");

    isChatOpen = !isChatOpen;

    panel.classList.toggle("closed", !isChatOpen);
    toggleBtn.classList.toggle("hidden", isChatOpen);
}

function runQuickAction(prompt) {
    if (!isChatOpen) {
        toggleChat();
    }
    const input = document.getElementById("chat-input");
    input.value = prompt;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    appendMessage(message, "user", true);
    input.value = "";

    const typingId = showTyping();
    try {
        const reply = await hrAssistant.process(message);
        removeTyping(typingId);
        appendAgenticMessage(reply, message);
        window.dispatchEvent(new CustomEvent("hr:data-updated", { detail: { key: "chat" } }));
    } catch (error) {
        removeTyping(typingId);
        appendMessage("I could not process that request. Please try again.", "ai", true);
        console.error(error);
    }
}

/**
 * Append an AI message with contextual follow-up action buttons.
 */
function appendAgenticMessage(text, userMessage) {
    const lower = (userMessage || "").toLowerCase();
    const actions = getAgenticActions(lower, text);

    const history = document.getElementById("chat-history");
    if (!history) return;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message ai";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = renderMarkdown(text);

    if (actions.length) {
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "agent-actions";
        actions.forEach((action) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `agent-action-btn ${action.style || ""}`;
            btn.textContent = action.label;
            btn.addEventListener("click", () => {
                actionsDiv.remove();
                if (action.action) {
                    action.action();
                } else if (action.prompt) {
                    runQuickAction(action.prompt);
                }
            });
            actionsDiv.appendChild(btn);
        });
        bubble.appendChild(actionsDiv);
    }

    wrapper.appendChild(bubble);
    history.appendChild(wrapper);
    history.scrollTop = history.scrollHeight;

    HRDataStore.appendChatMessage({ sender: "ai", text });
}

/**
 * Determine contextual follow-up actions based on conversation context.
 */
function getAgenticActions(lower, responseText) {
    const actions = [];

    if (lower.includes("rank") || lower.includes("top") || lower.includes("best candidate")) {
        actions.push(
            { label: "Evaluate top candidate", prompt: "Evaluate the top candidate", style: "yes" },
            { label: "Schedule interview", prompt: "Schedule interview", style: "" },
            { label: "Summarize latest resume", prompt: "Summarize latest resume", style: "" }
        );
    }

    if (lower.includes("jd") || lower.includes("job description")) {
        actions.push(
            { label: "Save this JD", style: "yes", action: () => navigateToPage("jobs.html") },
            { label: "Create another JD", prompt: "Create frontend engineer JD", style: "" },
            { label: "No thanks", style: "no", action: () => appendMessage("Understood. Let me know if you need anything else.", "ai", true) }
        );
    }

    if (lower.includes("summarize") || lower.includes("resume")) {
        actions.push(
            { label: "Rank all candidates", prompt: "Rank candidates", style: "" },
            { label: "Evaluate this candidate", prompt: "Evaluate the latest candidate", style: "yes" },
            { label: "Upload another resume", style: "", action: () => navigateToPage("upload.html") }
        );
    }

    if (lower.includes("schedule")) {
        actions.push(
            { label: "View schedule", style: "yes", action: () => navigateToPage("schedule.html") },
            { label: "Schedule another", prompt: "Schedule interview", style: "" },
            { label: "View analytics", prompt: "Show hiring analytics", style: "" }
        );
    }

    if (lower.includes("interview question") || lower.includes("questions")) {
        actions.push(
            { label: "Schedule interview now", prompt: "Schedule interview", style: "yes" },
            { label: "Evaluate candidate", prompt: "Evaluate the top candidate", style: "" },
            { label: "More questions", prompt: "Generate more interview questions", style: "" }
        );
    }

    if (lower.includes("analytics") || lower.includes("report") || lower.includes("pipeline")) {
        actions.push(
            { label: "Open analytics page", style: "yes", action: () => navigateToPage("analytics.html") },
            { label: "Rank candidates", prompt: "Rank candidates", style: "" },
            { label: "Upload resume", style: "", action: () => navigateToPage("upload.html") }
        );
    }

    if (lower.includes("evaluate")) {
        actions.push(
            { label: "Schedule interview", prompt: "Schedule interview", style: "yes" },
            { label: "Interview questions", prompt: "Generate interview questions", style: "" },
            { label: "View analytics", prompt: "Show hiring analytics", style: "" }
        );
    }

    if (!actions.length && (lower.includes("hello") || lower.includes("hi") || lower.includes("help") || lower === "")) {
        actions.push(
            { label: "Upload resume", style: "", action: () => navigateToPage("upload.html") },
            { label: "Create a JD", prompt: "Create backend developer JD", style: "yes" },
            { label: "Rank candidates", prompt: "Rank candidates", style: "" }
        );
    }

    return actions;
}

function navigateToPage(page) {
    window.location.href = page;
}

function appendMessage(text, sender, persist = false) {
    const history = document.getElementById("chat-history");
    if (!history) return;

    const wrapper = document.createElement("div");
    wrapper.className = `chat-message ${sender === "user" ? "user" : "ai"}`;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = renderMarkdown(text);

    wrapper.appendChild(bubble);
    history.appendChild(wrapper);
    history.scrollTop = history.scrollHeight;

    if (persist) {
        HRDataStore.appendChatMessage({ sender, text });
    }
}

function renderChatHistory() {
    const history = document.getElementById("chat-history");
    if (!history) return;
    history.innerHTML = "";

    const saved = HRDataStore.getChatHistory();
    if (!saved.length) {
        const welcomeText = "Hello. I can help rank candidates, summarize resumes, create job descriptions, prepare interview questions, schedule interviews, and explain hiring analytics. What would you like to do?";
        appendMessage(welcomeText, "ai", false);

        const lastBubble = history.querySelector(".chat-message:last-child .chat-bubble");
        if (lastBubble) {
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "agent-actions";
            const welcomeActions = [
                { label: "Upload a resume", action: () => navigateToPage("upload.html") },
                { label: "Create a Job Description", style: "yes", prompt: "Create backend developer JD" },
                { label: "Rank candidates", prompt: "Rank candidates" },
                { label: "Show analytics", prompt: "Show hiring analytics" }
            ];
            welcomeActions.forEach((action) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `agent-action-btn ${action.style || ""}`;
                btn.textContent = action.label;
                btn.addEventListener("click", () => {
                    actionsDiv.remove();
                    if (action.action) {
                        action.action();
                    } else if (action.prompt) {
                        runQuickAction(action.prompt);
                    }
                });
                actionsDiv.appendChild(btn);
            });
            lastBubble.appendChild(actionsDiv);
        }
        return;
    }

    saved.forEach((message) => appendMessage(message.text, message.sender, false));
}

function renderMarkdown(text) {
    if (window.marked && window.DOMPurify) {
        return DOMPurify.sanitize(marked.parse(text));
    }

    const escaped = escapeHtml(text);
    return escaped
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br>");
}

function showTyping() {
    const history = document.getElementById("chat-history");
    const id = `typing-${Date.now()}`;
    const div = document.createElement("div");
    div.id = id;
    div.className = "chat-message ai";
    div.innerHTML = `
        <div class="chat-bubble typing-bubble">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return id;
}

function removeTyping(id) {
    document.getElementById(id)?.remove();
}

function clearChat() {
    HRDataStore.clearChatHistory();
    renderChatHistory();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function exportToPDF(elementId, filename = 'export.pdf', dataContext = null) {
    try {
        await new Promise((resolve) => {
            if (window.jspdf) return resolve();
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            script.onload = resolve;
            document.head.appendChild(script);
        });
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        const addLine = (text, size = 12, isBold = false) => {
            doc.setFontSize(size);
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            const lines = doc.splitTextToSize(String(text), 170);
            lines.forEach(line => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(line, 20, y);
                y += size * 0.4 + 2; 
            });
            y += 5; 
        };

        if (filename.includes('analytics')) {
            const stats = HRDataStore.getAnalytics();
            addLine("ANALYTICS REPORT", 18, true);
            addLine(`Total Candidates: ${stats.totalCandidates}`);
            addLine(`Total Jobs: ${stats.totalJobs}`);
            addLine(`Total Interviews: ${stats.totalInterviews}`);
            addLine(`Average Score: ${stats.averageScore}%`);
        } else if (filename.includes('schedule')) {
            addLine("INTERVIEW SCHEDULE", 18, true);
            HRDataStore.getInterviews().forEach(i => {
                addLine(`Candidate: ${i.candidateName} for ${i.role}`, 12, true);
                addLine(`Time: ${i.date} at ${i.time}`);
                addLine(`Interviewer: ${i.interviewer}`);
                addLine(`Status: ${i.status}`);
                y += 5;
            });
        } else if (filename.includes('candidates')) {
            addLine("CANDIDATES DATABASE", 18, true);
            HRDataStore.getCandidates().forEach(c => {
                addLine(`${c.name} | ${c.role}`, 12, true);
                addLine(`Score: ${c.score}% | Status: ${c.status}`);
                addLine(`Skills: ${(c.skills||[]).join(', ')}`);
                y += 5;
            });
        } else if (filename.includes('job') && dataContext) {
            const job = HRDataStore.getJobs().find(j => j.id === dataContext);
            if (job) {
                addLine(`JOB DESCRIPTION: ${job.title}`, 18, true);
                addLine(`Department: ${job.department}`);
                addLine(`Location: ${job.location}`);
                addLine(`Status: ${job.status}`);
                addLine(`Skills: ${(job.skills||[]).join(', ')}`);
                y += 5;
                addLine("Description:", 12, true);
                addLine(job.description || "No description provided.");
            } else {
                addLine("Job not found.");
            }
        } else {
            addLine("Exported Data");
            const el = document.getElementById(elementId);
            if (el) addLine(el.innerText);
        }

        doc.save(filename.replace('.txt', '.pdf'));
    } catch (e) {
        console.error("PDF Export failed:", e);
        alert("Failed to export PDF.");
    }
}

window.exportToPDF = exportToPDF;
window.toggleChat = toggleChat;
window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.sendMessage = sendMessage;
window.runQuickAction = runQuickAction;
window.clearChat = clearChat;
