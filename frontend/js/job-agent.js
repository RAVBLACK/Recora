const HRJobAgent = {
    generateJobDescription(message = "") {
        const lower = message.toLowerCase();
        const title = lower.includes("backend")
            ? "Backend Developer"
            : lower.includes("frontend")
                ? "Frontend Engineer"
                : lower.includes("data")
                    ? "Data Analyst"
                    : "Software Engineer";

        const skills = this.skillsForRole(title);
        return [
            `## ${title}`,
            "",
            "### Role Summary",
            `We are hiring a ${title} to build reliable systems, collaborate with product and business teams, and improve delivery quality across the hiring workflow.`,
            "",
            "### Key Responsibilities",
            "- Own end-to-end delivery for assigned features and improvements.",
            "- Translate business requirements into clear, testable implementation plans.",
            "- Collaborate with stakeholders, document decisions, and improve team velocity.",
            "",
            "### Required Skills",
            skills.map((skill) => `- ${skill}`).join("\n"),
            "",
            "### Interview Focus",
            "- Technical depth",
            "- Communication and ownership",
            "- Practical problem solving",
            "- Ability to work with ambiguity"
        ].join("\n");
    },

    skillsForRole(title) {
        const map = {
            "Backend Developer": ["Python or Node.js", "REST APIs", "SQL databases", "Authentication and security", "Cloud deployment"],
            "Frontend Engineer": ["JavaScript or TypeScript", "React or a similar UI framework", "Accessible UI", "State management", "API integration"],
            "Data Analyst": ["SQL", "Excel or Sheets", "Dashboarding", "Statistics", "Clear business storytelling"],
            "Software Engineer": ["JavaScript", "Python", "SQL", "Testing", "System design fundamentals"]
        };
        return map[title] || map["Software Engineer"];
    },

    createJobFromForm(values) {
        return HRDataStore.saveJob({
            title: values.title,
            department: values.department,
            location: values.location,
            status: "Open",
            skills: values.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
            description: values.description
        });
    }
};

window.HRJobAgent = HRJobAgent;
