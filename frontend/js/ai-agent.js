class HRAssistantAgent {
    constructor({ candidateAgent, jobAgent, analyticsAgent, dataStore, config }) {
        this.candidateAgent = candidateAgent;
        this.jobAgent = jobAgent;
        this.analyticsAgent = analyticsAgent;
        this.dataStore = dataStore;
        this.config = config;
    }

    async process(message) {
        const lower = message.toLowerCase();
        const localResponse = this.routeLocal(message, lower);

        if (localResponse.handled && localResponse.final) {
            return localResponse.reply;
        }

        try {
            const aiReply = await this.askGroq(message);
            return aiReply || localResponse.reply || "I could not produce a response.";
        } catch (error) {
            console.warn("Groq request failed; using local fallback.", error);
            if (localResponse.handled) return `${localResponse.reply}\n\nGroq was unavailable, so I used local recruiting data for this answer.`;
            return "Groq was unavailable. I can still rank candidates, summarize resumes, create interview prompts, and show analytics from saved hiring data.";
        }
    }

    routeLocal(message, lower) {
        if (lower.includes("top") || lower.includes("rank") || lower.includes("best candidate")) {
            return { handled: true, final: true, reply: this.candidateAgent.rankCandidates(message) };
        }

        if (lower.includes("summarize latest") || lower.includes("latest resume")) {
            return { handled: true, final: true, reply: this.candidateAgent.summarizeLatest() };
        }

        if (lower.includes("candidate") && (lower.includes("list") || lower.includes("show") || lower.includes("find"))) {
            return { handled: true, final: true, reply: this.candidateAgent.findCandidates(message) };
        }

        if (lower.includes("interview question") || lower.includes("questions")) {
            return { handled: true, final: false, reply: this.candidateAgent.generateInterviewQuestions(message) };
        }

        if (lower.includes("job description") || lower.includes(" jd") || lower.includes("create jd") || lower.includes("developer jd")) {
            return { handled: true, final: false, reply: this.jobAgent.generateJobDescription(message) };
        }

        if (lower.includes("schedule")) {
            return { handled: true, final: true, reply: this.scheduleFromMessage(message) };
        }

        if (lower.includes("analytics") || lower.includes("report") || lower.includes("pipeline")) {
            return { handled: true, final: true, reply: this.analyticsAgent.generateReport() };
        }

        if (lower.includes("evaluate")) {
            return { handled: true, final: true, reply: this.candidateAgent.evaluateCandidate(message) };
        }

        return { handled: false, final: false, reply: "" };
    }

    scheduleFromMessage(message) {
        const candidates = this.dataStore.getCandidates();
        const candidate = candidates.find((item) => message.toLowerCase().includes(item.name.toLowerCase()));

        if (!candidate) {
            const names = candidates.slice(0, 5).map((item) => `- ${item.name} (${item.role})`).join("\n");
            return candidates.length
                ? `Who should I schedule?\n\n${names}\n\nTry: Schedule interview with ${candidates[0].name} tomorrow at 10:00.`
                : "Upload or add a candidate first, then I can schedule an interview.";
        }

        const isoDate = this.extractDate(message);
        const time = (message.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/) || [])[0] || "10:00";
        const interview = this.dataStore.saveInterview({
            candidateId: candidate.id,
            candidateName: candidate.name,
            role: candidate.role,
            date: isoDate,
            time,
            interviewer: "Hiring Team",
            notes: "Created from HR Assistant chat."
        });

        return `Scheduled **${interview.candidateName}** for **${interview.role}** on **${interview.date || "the requested date"} at ${interview.time}**.`;
    }

    extractDate(message) {
        const today = new Date();
        const lower = message.toLowerCase();
        if (lower.includes("tomorrow")) {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return tomorrow.toISOString().slice(0, 10);
        }

        const iso = message.match(/\b\d{4}-\d{2}-\d{2}\b/);
        if (iso) return iso[0];

        const slash = message.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
        if (slash) {
            const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
            return `${year}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`;
        }

        return today.toISOString().slice(0, 10);
    }

    async askGroq(message) {
        const payload = {
            model: this.config.getPreferredModel(),
            messages: [
                {
                    role: "system",
                    content: this.systemPrompt()
                },
                ...this.compactHistory(),
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.35
        };

        const primary = await this.callGroq(payload);
        if (primary.ok) return primary.content;

        const fallbackPayload = { ...payload, model: this.config.getFallbackModel() };
        const fallback = await this.callGroq(fallbackPayload);
        if (fallback.ok) return fallback.content;

        throw new Error(fallback.error || primary.error || "Groq request failed");
    }

    async callGroq(payload) {
        const response = await fetch("https://recora-backend-ex8q.onrender.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return { ok: false, error: data.error || response.statusText };
        }

        return {
            ok: true,
            content: data.reply || ""
        };
    }

    compactHistory() {
        return this.dataStore.getChatHistory().slice(-8).map((message) => ({
            role: message.sender === "user" ? "user" : "assistant",
            content: message.text
        }));
    }

    systemPrompt() {
        const analytics = this.dataStore.getAnalytics();
        const candidates = this.dataStore.getCandidates().slice(-12).map((candidate) => ({
            name: candidate.name,
            role: candidate.role,
            score: candidate.score,
            skills: candidate.skills,
            status: candidate.status,
            summary: candidate.summary
        }));
        const jobs = this.dataStore.getJobs();
        const interviews = this.dataStore.getInterviews().slice(-10);

        return [
            "You are the HR Assistant Agent for Recora.",
            "You are an AGENTIC assistant — be proactive. After answering any request, always suggest 2-3 concrete next steps the user can take.",
            "For example, after ranking candidates, suggest evaluating the top one or scheduling an interview.",
            "After generating a JD, ask if they want to save it or create another.",
            "After summarizing a resume, suggest ranking or evaluating candidates.",
            "Use the provided local application data as source of truth. If data is missing, say what is needed next.",
            "Return markdown. Be concise, practical, and action-oriented.",
            "",
            `Analytics: ${JSON.stringify(analytics)}`,
            `Candidates: ${JSON.stringify(candidates)}`,
            `Jobs: ${JSON.stringify(jobs)}`,
            `Interviews: ${JSON.stringify(interviews)}`
        ].join("\n");
    }
}

window.HRAssistantAgent = HRAssistantAgent;
