const HRResumeParser = {
    async parsePdf(file) {
        if (!window.pdfjsLib) {
            throw new Error("PDF parser is not loaded. Check the pdf.js script on the upload page.");
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            window.pdfjsLib.GlobalWorkerOptions.workerSrc ||
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(" ");
            pages.push(pageText);
        }

        return pages.join("\n").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim();
    },

    extractEmail(text) {
        return (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || "";
    },

    extractPhone(text) {
        return (text.match(/(?:\+?\d[\d\s().-]{7,}\d)/) || [])[0] || "";
    },

    extractName(text, fileName = "") {
        const email = this.extractEmail(text);
        const beforeEmail = email ? text.slice(0, text.indexOf(email)) : text.slice(0, 240);
        const candidates = beforeEmail
            .split(/[\n|•]+/)
            .map((line) => line.trim())
            .filter(Boolean);

        const nameLine = candidates.find((line) => {
            const words = line.split(/\s+/).filter(Boolean);
            return words.length >= 2 && words.length <= 5 && /^[A-Za-z][A-Za-z\s.'-]+$/.test(line);
        });

        if (nameLine) return this.titleCase(nameLine);

        return this.titleCase(
            fileName
                .replace(/\.[^.]+$/, "")
                .replace(/[_-]+/g, " ")
                .replace(/\b(resume|cv|profile)\b/gi, "")
                .trim() || "Unknown Candidate"
        );
    },

    titleCase(value) {
        return value
            .toLowerCase()
            .replace(/\b[a-z]/g, (char) => char.toUpperCase())
            .replace(/\s+/g, " ")
            .trim();
    }
};

window.HRResumeParser = HRResumeParser;

async function parseResume(file) {
    return HRResumeParser.parsePdf(file);
}
