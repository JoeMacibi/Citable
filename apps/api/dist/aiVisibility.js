const brandSignalKeywords = ['brand', 'company', 'product', 'pricing', 'crm', 'seo', 'ai visibility'];
function findIntent(prompt) {
    const normalized = prompt.toLowerCase();
    if (normalized.includes('pricing') || normalized.includes('cost') || normalized.includes('price'))
        return 'commercial-intent';
    if (normalized.includes('best') || normalized.includes('compare') || normalized.includes('vs'))
        return 'research-intent';
    if (normalized.includes('how to') || normalized.includes('guide'))
        return 'learning-intent';
    return 'informational';
}
export function evaluateAiVisibility(prompt, metadata = {}) {
    const trimmed = prompt.trim();
    const intent = findIntent(trimmed);
    const mentionBoost = Math.min(24, Math.max(6, Math.round(trimmed.split(/\s+/).length / 3)));
    const citations = Math.min(10, Math.max(2, Math.round((trimmed.length / 60) + (metadata.model ? 1 : 0))));
    const shareOfVoice = Math.min(99, Math.max(18, Math.round((mentionBoost + citations * 3) * 1.8)));
    const brandMentions = brandSignalKeywords.filter((term) => trimmed.toLowerCase().includes(term)).length;
    const sourceUrls = [
        'https://www.google.com/search?q=' + encodeURIComponent(trimmed),
        'https://www.perplexity.ai/search?q=' + encodeURIComponent(trimmed),
        'https://www.bing.com/search?q=' + encodeURIComponent(trimmed),
    ];
    return {
        mentions: mentionBoost,
        citations,
        shareOfVoice,
        intent,
        brandMentions,
        summary: `Prompt intent is ${intent} with a ${shareOfVoice}% share-of-voice signal and ${citations} cited source paths available for AI discovery.`,
        flow: ['Brand', 'AI Response', 'Cited Source Domain'],
        sourceUrls,
    };
}
