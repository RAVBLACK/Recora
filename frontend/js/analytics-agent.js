const HRAnalyticsAgent = {
    generateReport() {
        const analytics = HRDataStore.getAnalytics();
        const topCandidates = analytics.topCandidates.length
            ? analytics.topCandidates.map((candidate, index) => `${index + 1}. ${candidate.name} - ${candidate.score}% (${candidate.role})`).join("\n")
            : "No candidates uploaded yet.";

        return [
            "## Hiring Analytics",
            "",
            `- Total candidates: **${analytics.totalCandidates}**`,
            `- Active jobs: **${analytics.totalJobs}**`,
            `- Upcoming interviews: **${analytics.totalInterviews}**`,
            `- Average candidate score: **${analytics.averageScore}%**`,
            "",
            "### Top Candidates",
            topCandidates,
            "",
            "### Role Distribution",
            Object.keys(analytics.roleDistribution).length
                ? Object.entries(analytics.roleDistribution).map(([role, count]) => `- ${role}: ${count}`).join("\n")
                : "No role data yet.",
            "",
            "### Recommended Next Step",
            analytics.totalCandidates
                ? "Shortlist the top scoring candidates and schedule focused technical interviews."
                : "Upload PDF resumes so the assistant can build a candidate pipeline."
        ].join("\n");
    },

    chartDataFromMap(map, emptyLabel = "No Data") {
        const labels = Object.keys(map || {});
        const values = Object.values(map || {});
        if (!labels.length) {
            return { labels: [emptyLabel], values: [1] };
        }
        return { labels, values };
    }
};

window.HRAnalyticsAgent = HRAnalyticsAgent;
