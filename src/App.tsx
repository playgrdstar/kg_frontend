import React, { useState } from "react";
import { Box, Stack, Container, Typography, TextField, Button, IconButton, Divider, CircularProgress } from "@mui/material";
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import AdjustIcon from '@mui/icons-material/Adjust';
import GraphVisualization from "./components/GraphVisualization";
import QueryInterface from "./components/QueryInterface";
import { Article, KnowledgeGraph, QueryResult } from "./types/api.types";
import { generateKG, enrichKG, queryKG } from "./services/api";
import ArticlePanel from "./components/ArticlePanel";

const App: React.FC = () => {
    const [kgData, setKgData] = useState<KnowledgeGraph | null>(null);
    const [kgId, setKgId] = useState<string | null>(null);
    const [tickers, setTickers] = useState<string>("");
    const [window, setWindow] = useState<number>(1);
    const [limit, setLimit] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [completedSteps, setCompletedSteps] = useState<{
        generate: boolean;
        enrich: boolean;
        query: boolean;
    }>({
        generate: false,
        enrich: false,
        query: false,
    });
    const [query, setQuery] = useState<string>("");
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

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
            setCompletedSteps(prev => ({ ...prev, generate: true }));
        } catch (error) {
            console.error("Error generating KG:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQueryResult = (result: QueryResult) => {
        console.log("Query Result:", result);
    };

    const handleEnrichKG = async (): Promise<void> => {
        if (!kgId) {
            console.warn("No knowledge graph ID available for enrichment");
            return;
        }

        setIsLoading(true);
        console.log("Enriching KG with ID:", kgId);
        
        try {
            const response = await enrichKG([kgId]);
            console.log("Enriched Knowledge Graph Response:", response);
            console.log("Enriched Nodes:", response.kg.nodes.length);
            console.log("Enriched Edges:", response.kg.edges.length);
            
            setKgData(response.kg);
            setKgId(response.kg_id);
            setCompletedSteps(prev => ({ ...prev, enrich: true }));
        } catch (error) {
            console.error("Error enriching KG:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuerySubmit = async () => {
        if (!kgId || !query.trim()) return;
        
        setIsLoading(true);
        try {
            console.log("Selected nodes being sent to backend:", Array.from(selectedNodes));
            
            const selectedNodesData = Array.from(selectedNodes).map(nodeId => {
                const node = kgData?.nodes.find(n => n.id === nodeId);
                return {
                    id: nodeId,
                    originalNode: node
                };
            });
            console.log("Selected nodes full data:", selectedNodesData);
            
            const result = await queryKG(
                kgId,
                query,
                5, // top_n
                1, // connected_hops
                Array.from(selectedNodes)
            );
            handleQueryResult(result);
            setCompletedSteps(prev => ({ ...prev, query: true }));
        } catch (error) {
            console.error("Error querying KG:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRelevantArticles = (nodeId: string | null): Article[] => {
        if (!nodeId || !kgData) return kgData?.articles || [];
        
        // Find the selected node
        const selectedNode = kgData.nodes.find(node => node.id === nodeId);
        if (!selectedNode) return kgData.articles;

        // Filter articles based on the node's article URLs
        return kgData.articles.filter(article => 
            selectedNode.articles.includes(article.url)
        );
    };

    return (
        <Container maxWidth="xl">
            <Typography variant="h5" gutterBottom>
                Graph & Ask
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
                Step 1: Generate knowledge graphs from news articles. Use side panel to view news summaries and their associated knowledge graphs.
                <br />
                Step 2: Enrich with semantic information and combine all knowledge graphs. Use side panel to see overall summary.
                <br />
                Step 3: Query the combined knowledge graph to retrieve relevant information, and generate answer.
            </Typography>
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                    <Stack direction="column" alignItems="center" position="relative">
                        <IconButton 
                            onClick={handleGenerateKG} 
                            disabled={isLoading}
                        >
                        {completedSteps.generate ? <PanoramaFishEyeIcon /> : <AdjustIcon />}
                        </IconButton>
                        <Typography variant="caption" color="textSecondary">
                            {isLoading ? "" : "Generate"}
                        </Typography>
                        {isLoading && (
                            <CircularProgress
                                size={24}
                                sx={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    marginTop: "-12px",
                                    marginLeft: "-12px"
                                }}
                            />
                        )}
                    </Stack>
                    <Stack direction="column" alignItems="center" position="relative">
                        <IconButton 
                            onClick={handleEnrichKG} 
                            disabled={isLoading || !completedSteps.generate}
                        >
                            {completedSteps.enrich ? <PanoramaFishEyeIcon /> : <AdjustIcon />}
                        </IconButton>
                        <Typography variant="caption" color="textSecondary">
                            {isLoading ? "" : "Enrich"}
                        </Typography>
                        {isLoading && (
                            <CircularProgress
                                size={24}
                                sx={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    marginTop: "-12px",
                                    marginLeft: "-12px"
                                }}
                            />
                        )}
                    </Stack>
                    <Stack direction="column" alignItems="center" position="relative">
                        <IconButton 
                            onClick={() => console.log("Query button clicked")} 
                            disabled={isLoading || !completedSteps.enrich}
                        >
                            {completedSteps.query ? <PanoramaFishEyeIcon /> : <AdjustIcon />}
                        </IconButton>
                        <Typography variant="caption" color="textSecondary">
                            {isLoading ? "" : "Query"}
                        </Typography>
                        {isLoading && (
                            <CircularProgress
                                size={24}
                                sx={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    marginTop: "-12px",
                                    marginLeft: "-12px"
                                }}
                            />
                        )}
                    </Stack>
                </Stack>
                <Divider sx={{ my: 2}} />
                <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    label="Enter stock tickers (comma-separated)"
                    value={tickers}
                    onChange={(e) => setTickers(e.target.value)}
                    margin="normal"
                />
                <TextField
                    fullWidth
                    label="Window"
                    type="number"
                    value={window}
                    onChange={(e) => setWindow(Math.max(1, parseInt(e.target.value) || 1))}
                    margin="normal"
                />
                <TextField
                    fullWidth
                    label="Limit"
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    margin="normal"
                    />
                </Stack>
            </Box>
            {completedSteps.enrich && (
                <Box sx={{ mt: 4 }}>
                    <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
                        <TextField
                            fullWidth
                            label="Enter your query"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask a question about the knowledge graph..."
                            multiline
                            rows={1}
                            disabled={isLoading}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: "8px",
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleQuerySubmit}
                            disabled={isLoading || !query.trim()}
                            sx={{
                                height: "56px",
                                alignSelf: "flex-end",
                                minWidth: "120px"
                            }}
                        >
                            {isLoading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                "Query"
                            )}
                        </Button>
                    </Stack>
                </Box>
            )}
            {kgData && (
                <Box sx={{ mt: 4 }}>
                    <Box sx={{ 
                        display: "flex",
                        gap: 2,
                        height: "600px"
                    }}>
                        <Box sx={{ 
                            flex: 1,
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            overflow: "hidden",
                            position: "relative"
                        }}>
                            {isLoading ? (
                                <Box sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "rgba(255, 255, 255, 0.7)"
                                }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <GraphVisualization 
                                    data={kgData} 
                                    selectedNodes={selectedNodes}
                                    onNodeClick={(nodeId: string, isMultiSelect?: boolean) => {
                                        console.log("Node clicked:", nodeId);
                                        if (isMultiSelect) {
                                            const newSelectedNodes = new Set(selectedNodes);
                                            if (newSelectedNodes.has(nodeId)) {
                                                newSelectedNodes.delete(nodeId);
                                            } else {
                                                newSelectedNodes.add(nodeId);
                                            }
                                            setSelectedNodes(newSelectedNodes);
                                        } else {
                                            setSelectedNodes(new Set([nodeId]));
                                        }
                                        setSelectedNodeId(nodeId);
                                    }}
                                    onSelectionClear={() => {
                                        setSelectedNodes(new Set());
                                        setSelectedNodeId(null);
                                    }}
                                />
                            )}
                        </Box>
                        
                        <ArticlePanel
                            articles={getRelevantArticles(selectedNodeId)}
                            selectedNodeId={selectedNodeId}
                            onClose={() => setSelectedNodeId(null)}
                            kgSummary={kgData.summary}
                            isEnriched={completedSteps.enrich}
                        />
                    </Box>
                </Box>
            )}
        </Container>
    );
};

export default App;
