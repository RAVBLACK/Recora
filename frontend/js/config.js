const HRConfig = {
    preferredModel: "llama-3.3-70b-versatile",
    fallbackModel: "llama-3.1-8b-instant",

    async init() {},

    getPreferredModel() {
        return this.preferredModel;
    },

    getFallbackModel() {
        return this.fallbackModel;
    }
};

window.HRConfig = HRConfig;