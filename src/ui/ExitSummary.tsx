import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { useStore } from "@/agent/core/state.js";

function msToSeconds(ms: number): string {
    return (ms / 1000).toFixed(1) + "s";
}

export default function ExitSummary() {
    const { sessionId, startedAt, llmRequests, llmApiTimeMs, toolCallsSuccess, toolCallsFailure, toolTimeMs, modelUsage } =
        useStore((s) => s.metrics);

    const wallTime = useMemo(() => Date.now() - startedAt, [startedAt]);
    const totalToolCalls = toolCallsSuccess + toolCallsFailure;
    const successRate = totalToolCalls > 0 ? ((toolCallsSuccess / totalToolCalls) * 100).toFixed(1) + "%" : "0.0%";

    return (
        <Box flexDirection="column" paddingX={1} marginTop={1}>
            <Text>✦ Goodbye</Text>
            <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1} paddingY={1} width={100}>
                <Box flexDirection="column" width="100%">
                    <Box>
                        <Text>
                            Agent powering down. Goodbye!
                        </Text>
                    </Box>

                    <Box marginTop={1} flexDirection="column">
                        <Text color="gray">Interaction Summary</Text>
                        <Box>
                            <Text>
                                Session ID:                 {sessionId}
                            </Text>
                        </Box>
                        <Box>
                            <Text>
                                Tool Calls:                 {totalToolCalls} ( ✓ {toolCallsSuccess} x {toolCallsFailure} )
                            </Text>
                        </Box>
                        <Box>
                            <Text>Success Rate:               {successRate}</Text>
                        </Box>
                    </Box>

                    <Box marginTop={1} flexDirection="column">
                        <Text color="gray">Performance</Text>
                        <Box>
                            <Text>Wall Time:                  {msToSeconds(wallTime)}</Text>
                        </Box>
                        <Box>
                            <Text>Agent Active:               {msToSeconds(llmApiTimeMs + toolTimeMs)}</Text>
                        </Box>
                        <Box>
                            <Text>  » API Time:               {msToSeconds(llmApiTimeMs)}</Text>
                        </Box>
                        <Box>
                            <Text>  » Tool Time:              {msToSeconds(toolTimeMs)}</Text>
                        </Box>
                    </Box>

                    <Box marginTop={1} flexDirection="column">
                        <Text color="gray">Model Usage                  Reqs</Text>
                        {Object.keys(modelUsage).length === 0 ? (
                            <Text>  —</Text>
                        ) : (
                            Object.entries(modelUsage).map(([name, info]) => (
                                <Text key={name}>
                                    {name.padEnd(28)} {String(info.requests).padStart(3)}
                                </Text>
                            ))
                        )}
                    </Box>

                    <Box marginTop={1}>
                        <Text color="gray">» Tip:</Text>
                        <Text> For models and settings, try "/models" or "/help".</Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

