const HRStorageKeys = {
    candidates: "hr.candidates",
    jobs: "hr.jobs",
    interviews: "hr.interviews",
    evaluations: "hr.evaluations",
    chatHistory: "hr.chatHistory"
};

const HRDataStore = {
    init() {
        this.ensureCollection(HRStorageKeys.candidates, []);
        this.ensureCollection(HRStorageKeys.jobs, this.defaultJobs());
        this.ensureCollection(HRStorageKeys.interviews, []);
        this.ensureCollection(HRStorageKeys.evaluations, []);
        this.ensureCollection(HRStorageKeys.chatHistory, []);

        this.migrateLegacyKey("candidates", HRStorageKeys.candidates);
        this.migrateLegacyKey("jobs", HRStorageKeys.jobs);
        this.migrateLegacyKey("interviews", HRStorageKeys.interviews);
    },

    ensureCollection(key, fallback) {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(fallback));
        }
    },

    migrateLegacyKey(legacyKey, newKey) {
        const legacy = localStorage.getItem(legacyKey);
        const current = this.read(newKey);
        if (legacy && Array.isArray(current) && current.length === 0) {
            try {
                localStorage.setItem(newKey, legacy);
            } catch (error) {
                console.warn("Unable to migrate legacy data", legacyKey, error);
            }
        }
    },

    defaultJobs() {
        return [
            {
                id: "job-software-engineer",
                title: "Software Engineer",
                department: "Engineering",
                location: "Remote",
                status: "Open",
                skills: ["Python", "Flask", "SQL", "API", "AI", "Cloud"],
                description: "Build reliable backend services, APIs, and automation systems for hiring workflows.",
                createdAt: new Date().toISOString()
            },
            {
                id: "job-data-analyst",
                title: "Data Analyst",
                department: "People Analytics",
                location: "Hybrid",
                status: "Open",
                skills: ["SQL", "Excel", "Power BI", "Python", "Statistics"],
                description: "Turn hiring and workforce data into clear operational insights.",
                createdAt: new Date().toISOString()
            }
        ];
    },

    read(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (error) {
            console.warn("Invalid localStorage payload for", key, error);
            return [];
        }
    },

    write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent("hr:data-updated", { detail: { key } }));
    },

    makeId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    },

    getCandidates() {
        return this.read(HRStorageKeys.candidates);
    },

    saveCandidate(candidate) {
        const candidates = this.getCandidates();
        const normalized = {
            id: candidate.id || this.makeId("candidate"),
            name: candidate.name || "Unknown Candidate",
            role: candidate.role || "General Applicant",
            score: Number(candidate.score || 0),
            skills: Array.isArray(candidate.skills) ? candidate.skills : [],
            summary: candidate.summary || "",
            status: candidate.status || "Screened",
            uploadedAt: candidate.uploadedAt || new Date().toISOString(),
            resumeText: candidate.resumeText || ""
        };

        const index = candidates.findIndex((item) => item.id === normalized.id);
        if (index >= 0) {
            candidates[index] = normalized;
        } else {
            candidates.push(normalized);
        }

        this.write(HRStorageKeys.candidates, candidates);
        return normalized;
    },

    updateCandidate(id, updates) {
        const candidates = this.getCandidates().map((candidate) => (
            candidate.id === id ? { ...candidate, ...updates } : candidate
        ));
        this.write(HRStorageKeys.candidates, candidates);
    },

    deleteCandidate(id) {
        const candidates = this.getCandidates().filter(item => item.id !== id);
        this.write(HRStorageKeys.candidates, candidates);
    },

    getJobs() {
        return this.read(HRStorageKeys.jobs);
    },

    saveJob(job) {
        const jobs = this.getJobs();
        const normalized = {
            id: job.id || this.makeId("job"),
            title: job.title || "Untitled Role",
            department: job.department || "Hiring",
            location: job.location || "Remote",
            status: job.status || "Open",
            skills: Array.isArray(job.skills) ? job.skills : [],
            description: job.description || "",
            createdAt: job.createdAt || new Date().toISOString()
        };

        jobs.push(normalized);
        this.write(HRStorageKeys.jobs, jobs);
        return normalized;
    },

    deleteJob(id) {
        const jobs = this.getJobs().filter(item => item.id !== id);
        this.write(HRStorageKeys.jobs, jobs);
    },

    getInterviews() {
        return this.read(HRStorageKeys.interviews);
    },

    saveInterview(interview) {
        const interviews = this.getInterviews();
        const normalized = {
            id: interview.id || this.makeId("interview"),
            candidateId: interview.candidateId || "",
            candidateName: interview.candidateName || "Candidate",
            role: interview.role || "",
            date: interview.date || "",
            time: interview.time || "",
            interviewer: interview.interviewer || "Hiring Team",
            status: interview.status || "Scheduled",
            notes: interview.notes || "",
            createdAt: interview.createdAt || new Date().toISOString()
        };

        interviews.push(normalized);
        this.write(HRStorageKeys.interviews, interviews);
        return normalized;
    },

    deleteInterview(id) {
        const interviews = this.getInterviews().filter(item => item.id !== id);
        this.write(HRStorageKeys.interviews, interviews);
    },

    getEvaluations() {
        return this.read(HRStorageKeys.evaluations);
    },

    saveEvaluation(evaluation) {
        const evaluations = this.getEvaluations();
        const normalized = {
            id: evaluation.id || this.makeId("evaluation"),
            candidateId: evaluation.candidateId || "",
            candidateName: evaluation.candidateName || "Candidate",
            score: Number(evaluation.score || 0),
            recommendation: evaluation.recommendation || "Review",
            notes: evaluation.notes || "",
            createdAt: evaluation.createdAt || new Date().toISOString()
        };

        evaluations.push(normalized);
        this.write(HRStorageKeys.evaluations, evaluations);
        return normalized;
    },

    deleteEvaluation(id) {
        const evaluations = this.getEvaluations().filter(item => item.id !== id);
        this.write(HRStorageKeys.evaluations, evaluations);
    },

    getChatHistory() {
        return this.read(HRStorageKeys.chatHistory);
    },

    saveChatHistory(messages) {
        this.write(HRStorageKeys.chatHistory, messages.slice(-80));
    },

    appendChatMessage(message) {
        const history = this.getChatHistory();
        history.push({
            id: this.makeId("message"),
            sender: message.sender,
            text: message.text,
            createdAt: message.createdAt || new Date().toISOString()
        });
        this.saveChatHistory(history);
    },

    clearChatHistory() {
        this.write(HRStorageKeys.chatHistory, []);
    },

    getAnalytics() {
        const candidates = this.getCandidates();
        const jobs = this.getJobs().filter((job) => job.status !== "Closed");
        const interviews = this.getInterviews();
        const evaluations = this.getEvaluations();
        const upcomingInterviews = interviews.filter((interview) => {
            if (!interview.date) return true;
            return new Date(`${interview.date}T${interview.time || "00:00"}`) >= new Date();
        });

        const roleDistribution = candidates.reduce((acc, candidate) => {
            const role = candidate.role || "Unclassified";
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        const statusDistribution = candidates.reduce((acc, candidate) => {
            const status = candidate.status || "Screened";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const averageScore = candidates.length
            ? Math.round(candidates.reduce((sum, candidate) => sum + Number(candidate.score || 0), 0) / candidates.length)
            : 0;

        return {
            totalCandidates: candidates.length,
            totalJobs: jobs.length,
            totalInterviews: upcomingInterviews.length,
            totalEvaluations: evaluations.length,
            averageScore,
            roleDistribution,
            statusDistribution,
            topCandidates: [...candidates].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 5)
        };
    }
};

HRDataStore.init();

window.HRDataStore = HRDataStore;
window.DataStore = HRDataStore;
