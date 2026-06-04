const HRCandidateAgent = {
    skillCatalog: [
        "JavaScript", "TypeScript", "React", "Angular", "Vue", "Node.js", "Python", "Flask",
        "Django", "FastAPI", "API", "AI", "Java", "Spring", "C#", ".NET", "SQL", "PostgreSQL", "MySQL",
        "MongoDB", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Machine Learning",
        "NLP", "Data Analysis", "Excel", "Power BI", "Tableau", "Recruiting", "HRIS",
        "Payroll", "Sourcing", "Interviewing", "Project Management", "Agile", "Scrum"
    ],

    createCandidateFromResume(text, fileName, jobId) {
        const jobs = HRDataStore.getJobs();
        const job = jobs.find((item) => item.id === jobId) || jobs[0] || {};
        const skills = this.extractSkills(text);
        const role = this.classifyRole(text, job, skills);
        const score = this.scoreCandidate(skills, job, text);
        const name = HRResumeParser.extractName(text, fileName);

        return {
            id: HRDataStore.makeId("candidate"),
            name,
            role,
            score,
            skills,
            summary: this.summarizeResume(text, skills, role),
            status: score >= 85 ? "Shortlisted" : "Screened",
            uploadedAt: new Date().toISOString(),
            resumeText: text,
            email: HRResumeParser.extractEmail(text),
            phone: HRResumeParser.extractPhone(text)
        };
    },

    extractSkills(text) {
        const lower = text.toLowerCase();
        const found = this.skillCatalog.filter((skill) => {
            if (skill === "API") return /\bapis?\b/i.test(lower);
            if (skill === "Machine Learning") return /\b(machine learning|ml)\b/i.test(lower);
            if (skill === "Power BI") return /\bpower\s*bi\b/i.test(lower);
            const normalized = skill.toLowerCase().replace(".", "\\.");
            return new RegExp(`\\b${normalized}\\b`, "i").test(lower);
        });
        return [...new Set(found)].slice(0, 12);
    },

    classifyRole(text, job, skills) {
        const lower = text.toLowerCase();
        const roleSignals = [
            { role: "Frontend Engineer", terms: ["react", "frontend", "ui", "javascript", "typescript", "css"] },
            { role: "Backend Developer", terms: ["backend", "api", "python", "node", "flask", "django", "sql"] },
            { role: "Data Analyst", terms: ["analyst", "sql", "excel", "dashboard", "power bi", "tableau"] },
            { role: "Machine Learning Engineer", terms: ["machine learning", "nlp", "model", "pytorch", "tensorflow"] },
            { role: "HR Specialist", terms: ["recruiting", "sourcing", "payroll", "hris", "interviewing"] },
            { role: "Project Manager", terms: ["project management", "scrum", "agile", "stakeholder"] }
        ];

        const best = roleSignals
            .map((signal) => ({
                role: signal.role,
                score: signal.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0)
            }))
            .sort((a, b) => b.score - a.score)[0];

        if (best && best.score > 0) return best.role;
        if (job.title) return job.title;
        if (skills.includes("Python") || skills.includes("SQL")) return "Software Engineer";
        return "General Applicant";
    },

    scoreCandidate(skills, job, text) {
        const jobSkills = Array.isArray(job.skills) ? job.skills : [];
        const matchingSkills = skills.filter((skill) => (
            jobSkills.some((jobSkill) => jobSkill.toLowerCase() === skill.toLowerCase())
        ));
        const skillScore = jobSkills.length ? (matchingSkills.length / jobSkills.length) * 60 : Math.min(skills.length * 6, 60);
        const experienceSignals = (text.match(/\b(experience|led|built|managed|designed|implemented|optimized)\b/gi) || []).length;
        const experienceScore = Math.min(experienceSignals * 4, 25);
        const completenessScore = Math.min(Math.round(text.length / 400), 15);
        return Math.max(45, Math.min(98, Math.round(skillScore + experienceScore + completenessScore)));
    },

    summarizeResume(text, skills, role) {
        const cleanText = text
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
            .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "");
        const sentences = cleanText
            .split(/(?<=[.!?])\s+/)
            .filter((sentence) => sentence.length > 40 && sentence.length < 240)
            .slice(0, 2);
        const skillText = skills.length ? `Key skills include ${skills.slice(0, 6).join(", ")}.` : "Skills were not clearly detected.";
        return `${role} profile extracted from the uploaded resume. ${skillText} ${sentences.join(" ")}`.trim();
    },

    rankCandidates(message = "") {
        const filter = this.extractSkillFilter(message);
        let candidates = HRDataStore.getCandidates();
        if (filter) {
            candidates = candidates.filter((candidate) => (
                candidate.skills.some((skill) => skill.toLowerCase().includes(filter))
                || candidate.role.toLowerCase().includes(filter)
                || candidate.summary.toLowerCase().includes(filter)
            ));
        }

        if (!candidates.length) return filter ? `No candidates matched "${filter}".` : "No candidates available. Upload resumes to start ranking.";

        return candidates
            .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
            .slice(0, 8)
            .map((candidate, index) => (
                `${index + 1}. **${candidate.name}** - ${candidate.score}% (${candidate.role})\n` +
                `   Skills: ${(candidate.skills || []).slice(0, 6).join(", ") || "No skills detected"}\n` +
                `   Why: ${candidate.summary || "Strongest match based on stored candidate score."}`
            ))
            .join("\n\n");
    },

    extractSkillFilter(message) {
        const lower = message.toLowerCase();
        const skill = this.skillCatalog.find((item) => lower.includes(item.toLowerCase()));
        if (skill) return skill.toLowerCase();
        const roleMatch = lower.match(/\b(frontend|backend|python|data|analyst|hr|recruiter|developer|engineer)\b/);
        return roleMatch ? roleMatch[0] : "";
    },

    findCandidates(message = "") {
        const candidates = HRDataStore.getCandidates();
        if (!candidates.length) return "No candidates found. Upload a PDF resume to create the first candidate.";
        return this.rankCandidates(message);
    },

    summarizeLatest() {
        const candidates = HRDataStore.getCandidates();
        if (!candidates.length) return "No resumes have been uploaded yet.";
        const latest = [...candidates].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
        return [
            `**${latest.name}**`,
            `Role: ${latest.role}`,
            `Score: ${latest.score}%`,
            `Status: ${latest.status}`,
            `Skills: ${(latest.skills || []).join(", ") || "No skills detected"}`,
            "",
            latest.summary || "No summary available."
        ].join("\n");
    },

    evaluateCandidate(message = "") {
        const lower = message.toLowerCase();
        const candidates = HRDataStore.getCandidates();
        const candidate = candidates.find((item) => lower.includes(item.name.toLowerCase())) || candidates[0];
        if (!candidate) return "Upload a resume first, then I can evaluate the candidate.";

        const recommendation = candidate.score >= 85 ? "Strong hire signal" : candidate.score >= 70 ? "Proceed with focused screen" : "Needs more evidence";
        HRDataStore.saveEvaluation({
            candidateId: candidate.id,
            candidateName: candidate.name,
            score: candidate.score,
            recommendation,
            notes: candidate.summary
        });

        return [
            `**Evaluation: ${candidate.name}**`,
            `Recommendation: ${recommendation}`,
            `Score: ${candidate.score}%`,
            `Role fit: ${candidate.role}`,
            `Strengths: ${(candidate.skills || []).slice(0, 5).join(", ") || "Not enough structured skills detected"}`,
            `Next step: Ask role-specific questions around the top skills and validate recent project ownership.`
        ].join("\n");
    },

    generateInterviewQuestions(message = "") {
        const lower = message.toLowerCase();
        const candidate = HRDataStore.getCandidates().find((item) => lower.includes(item.name.toLowerCase()));
        const role = candidate?.role || this.inferRoleFromMessage(message) || "the role";
        const skills = candidate?.skills?.slice(0, 4) || [];
        const focus = skills.length ? skills.join(", ") : role;

        return [
            `Here are interview questions for **${role}**:`,
            "",
            `1. Walk me through a recent project where you used ${focus}. What tradeoffs did you make?`,
            "2. Describe a difficult production or delivery issue you owned. How did you diagnose it?",
            "3. How do you evaluate quality before handing work to a team or customer?",
            "4. Tell me about a time you had incomplete requirements. What did you clarify first?",
            "5. What would you improve in the role or system after your first 90 days?"
        ].join("\n");
    },

    inferRoleFromMessage(message) {
        const match = message.match(/(?:for|as)\s+([a-zA-Z ]{3,40})/i);
        return match ? match[1].trim() : "";
    }
};

window.HRCandidateAgent = HRCandidateAgent;
