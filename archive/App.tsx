import React, { useState } from "react";
import { Box, Container, Typography, TextField, Button, CircularProgress, Stack } from "@mui/material";
import GraphVisualization from "./components/GraphVisualization";
import QueryInterface from "./components/QueryInterface";
import { KnowledgeGraph, QueryResult } from "./types/api.types";
import { generateKG } from "./services/api";

const App: React.FC = () => {
    const [kgData, setKgData] = useState<KnowledgeGraph | null>(null);
    const [kgId, setKgId] = useState<string | null>(null);
    const [tickers, setTickers] = useState<string>("");
    const [window, setWindow] = useState<number>(1);
    const [limit, setLimit] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleGenerateKG = async () => {
        if (!tickers.trim()) return;
        
        setIsLoading(true);
        console.log("Generating KG with parameters:", {
            tickers,
            window,
            limit
        });
        
        try {
            const response = await generateKG(tickers, window, limit);
            console.log("Knowledge Graph Response:", response);
            console.log("Nodes:", response.kg.nodes.length);
            console.log("Edges:", response.kg.edges.length);
            setKgData(response.kg);
            setKgId(response.kg_id);
        } catch (error) {
            console.error("Error generating KG:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQueryResult = (result: QueryResult) => {
        console.log("Query Result:", result);
    };

    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                KG Explorer
            </Typography>
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={1}>
                    <TextField
                        label="Enter stock tickers (comma-separated)"
                        value={tickers}
                        onChange={(e) => setTickers(e.target.value)}
                    />
                    <TextField
                        label="Window"
                        type="number"
                        value={window}
                        onChange={(e) => setWindow(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <TextField
                        label="Limit"
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                </Stack>
                <Box sx={{ position: "relative" }}>
                    <Button
                        variant="contained"
                        onClick={handleGenerateKG}
                        disabled={isLoading}
                        sx={{ mt: 2 }}
                    >
                        {isLoading ? "Generating..." : "Generate Knowledge Graph"}
                    </Button>
                    {isLoading && (
                        <CircularProgress
                            size={24}
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                marginTop: "10px",
                                marginLeft: "-12px"
                            }}
                        />
                    )}
                </Box>
            </Box>
            {kgId && (
                <QueryInterface kgId={kgId} onQueryResult={handleQueryResult} />
            )}
            {kgData && (
                <GraphVisualization 
                    data={kgData} 
                    onNodeClick={(nodeId) => console.log("Node clicked:", nodeId)} 
                />
            )}
        </Container>
    );
};

export default App;
