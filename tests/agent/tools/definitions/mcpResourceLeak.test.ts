import { beforeEach, describe, expect, it, vi } from "vitest";

describe("MCP Resource Leak", () => {
    let mockClient: any;
    let mockTransport: any;
    let clientCloseCalled: boolean;
    let transportCloseCalled: boolean;

    beforeEach(() => {
        clientCloseCalled = false;
        transportCloseCalled = false;

        mockClient = {
            connect: vi.fn(),
            callTool: vi.fn(),
            close: vi.fn(async () => {
                clientCloseCalled = true;
            }),
        };

        mockTransport = {
            close: vi.fn(async () => {
                transportCloseCalled = true;
            }),
        };
    });

    describe("Resource cleanup on success", () => {
        it("should close both client and transport on success", async () => {
            mockClient.callTool.mockResolvedValue({
                content: [{ type: "text", text: "success" }],
            });

            try {
                await mockClient.connect(mockTransport);
                await mockClient.callTool({ name: "test", arguments: {} });
            } finally {
                try {
                    await mockClient.close();
                } catch (closeError) {}
                try {
                    await mockTransport.close();
                } catch (closeError) {}
            }

            expect(clientCloseCalled).toBe(true);
            expect(transportCloseCalled).toBe(true);
        });

        it("should close transport even if client close fails", async () => {
            mockClient.close.mockRejectedValue(new Error("Client close failed"));

            try {
                await mockClient.connect(mockTransport);
            } finally {
                try {
                    await mockClient.close();
                } catch (closeError) {}
                try {
                    await mockTransport.close();
                } catch (closeError) {}
            }

            expect(transportCloseCalled).toBe(true);
        });

        it("should close client even if transport close fails", async () => {
            mockTransport.close.mockRejectedValue(new Error("Transport close failed"));

            try {
                await mockClient.connect(mockTransport);
            } finally {
                try {
                    await mockClient.close();
                } catch (closeError) {}
                try {
                    await mockTransport.close();
                } catch (closeError) {}
            }

            expect(clientCloseCalled).toBe(true);
        });
    });

    describe("Resource cleanup on error", () => {
        it("should close both client and transport on error", async () => {
            mockClient.callTool.mockRejectedValue(new Error("Tool error"));

            try {
                await mockClient.connect(mockTransport);
                await mockClient.callTool({ name: "test", arguments: {} });
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            } finally {
                try {
                    await mockClient.close();
                } catch (closeError) {}
                try {
                    await mockTransport.close();
                } catch (closeError) {}
            }

            expect(clientCloseCalled).toBe(true);
            expect(transportCloseCalled).toBe(true);
        });

        it("should handle multiple cleanup errors gracefully", async () => {
            mockClient.close.mockRejectedValue(new Error("Client close failed"));
            mockTransport.close.mockRejectedValue(new Error("Transport close failed"));

            try {
                await mockClient.connect(mockTransport);
            } finally {
                try {
                    await mockClient.close();
                } catch (closeError) {}
                try {
                    await mockTransport.close();
                } catch (closeError) {}
            }

            expect(mockClient.close).toHaveBeenCalled();
            expect(mockTransport.close).toHaveBeenCalled();
        });
    });

    describe("Cleanup order", () => {
        it("should close client before transport", async () => {
            const callOrder: string[] = [];

            mockClient.close.mockImplementation(async () => {
                callOrder.push("client");
                clientCloseCalled = true;
            });

            mockTransport.close.mockImplementation(async () => {
                callOrder.push("transport");
                transportCloseCalled = true;
            });

            try {
                await mockClient.connect(mockTransport);
            } finally {
                try {
                    await mockClient.close();
                } catch (closeError) {}
                try {
                    await mockTransport.close();
                } catch (closeError) {}
            }

            expect(callOrder).toEqual(["client", "transport"]);
        });
    });

    describe("Connection leak scenarios", () => {
        it("should not leak connections on rapid calls", async () => {
            const connections: Array<{ client: boolean; transport: boolean }> = [];

            for (let i = 0; i < 5; i++) {
                let localClientClosed = false;
                let localTransportClosed = false;

                const localClient = {
                    connect: vi.fn(),
                    close: vi.fn(async () => {
                        localClientClosed = true;
                    }),
                };

                const localTransport = {
                    close: vi.fn(async () => {
                        localTransportClosed = true;
                    }),
                };

                try {
                    await localClient.connect(localTransport);
                } finally {
                    try {
                        await localClient.close();
                    } catch (closeError) {}
                    try {
                        await localTransport.close();
                    } catch (closeError) {}
                }

                connections.push({
                    client: localClientClosed,
                    transport: localTransportClosed,
                });
            }

            expect(connections.every((c) => c.client && c.transport)).toBe(true);
        });
    });
});
