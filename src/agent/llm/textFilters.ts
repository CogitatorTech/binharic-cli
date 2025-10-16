export function filterReasoningTags(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function createStreamingTextFilter() {
    let buffer = "";
    let insideThinkTag = false;

    const filterFunc = function filterChunk(chunk: string): string {
        buffer += chunk;

        const thinkStartRegex = /<think>/gi;
        const thinkEndRegex = /<\/think>/gi;

        let result = "";
        let lastIndex = 0;

        while (lastIndex < buffer.length) {
            if (!insideThinkTag) {
                const startMatch = thinkStartRegex.exec(buffer.slice(lastIndex));

                if (startMatch) {
                    result += buffer.slice(lastIndex, lastIndex + startMatch.index);
                    insideThinkTag = true;
                    lastIndex += startMatch.index + startMatch[0].length;
                    thinkStartRegex.lastIndex = 0;
                } else {
                    const safeLength = buffer.length - 7;
                    if (safeLength > lastIndex) {
                        result += buffer.slice(lastIndex, safeLength);
                        buffer = buffer.slice(safeLength);
                        lastIndex = 0;
                    }
                    break;
                }
            } else {
                const endMatch = thinkEndRegex.exec(buffer.slice(lastIndex));

                if (endMatch) {
                    insideThinkTag = false;
                    lastIndex += endMatch.index + endMatch[0].length;
                    thinkEndRegex.lastIndex = 0;
                } else {
                    buffer = buffer.slice(lastIndex);
                    lastIndex = 0;
                    break;
                }
            }
        }

        if (lastIndex > 0) {
            buffer = buffer.slice(lastIndex);
        }

        return result;
    };

    filterFunc.flush = function (): string {
        const remaining = buffer;
        buffer = "";
        return remaining;
    };

    return filterFunc;
}

export function finalizeFilteredText(text: string): string {
    return text.trim();
}
