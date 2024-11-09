import React, { useState } from "react";
import { Box, Stack, Typography, TextField, Button, IconButton, Divider, CircularProgress, Drawer, Chip, Link } from "@mui/material";
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import AdjustIcon from '@mui/icons-material/Adjust';
import GraphVisualization from "./components/GraphVisualization";
import { Article, KnowledgeGraph, QueryResponse, KGNode } from "./types/api.types";
import { generateKG, enrichKG, queryKG } from "./services/api";
import ArticlePanel from "./components/ArticlePanel";
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import CloseIcon from '@mui/icons-material/Close';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

type GenerationProgress = {
    current: number;
    total: number;
} | null;

interface StreamingUpdate {
    nodes: Set<string>;
    timestamp: number;
}

const NodeDetails: React.FC<{ node: KGNode }> = ({ node }) => {
    return (
        <Box sx={{ mb: 1 }}>
            {/* <Typography variant="h6" gutterBottom>
                Node Details
            </Typography> */}
            {/* <Typography variant="subtitle2" gutterBottom>
                ID: {node.id}
            </Typography> */}
            <Typography variant="subtitle2" gutterBottom>
                Type: {node.type}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
                Summary: {node.summary}
            </Typography>
            {node.community !== null && (
                <Typography variant="subtitle2" gutterBottom>
                    Community: {node.community}
                </Typography>
            )}
            {node.articles && node.articles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Related Articles:
                    </Typography>
                    {node.articles.map((article, index) => (
                        <Link href={article} key={index} underline="hover" variant="body2" gutterBottom>
                            {article}
                        </Link>
                    ))}
                </Box>
            )}
        </Box>
    );
};

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
    const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
    const [generationProgress, setGenerationProgress] = useState<GenerationProgress>(null);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const [streamingUpdates, setStreamingUpdates] = useState<StreamingUpdate | null>(null);

    const handleGenerateKG = async () => {
        if (!tickers.trim()) return;
        
        try {
            setIsLoading(true);
            setGenerationProgress(null);
            setKgData(null);  // Reset existing KG data
            
            // Close existing EventSource if any
            if (eventSource) {
                eventSource.close();
                setEventSource(null);
            }

            const params = new URLSearchParams({
                tickers,
                window: window.toString(),
                limit: limit.toString()
            });

            const apiUrl = `http://localhost:8000/api/generate?${params.toString()}`;
            console.log("[SSE] Connecting to:", apiUrl);

            // Create new EventSource without initial fetch check
            const newEventSource = new EventSource(apiUrl);
            let reconnectAttempts = 0;
            const MAX_RECONNECT_ATTEMPTS = 3;

            newEventSource.onopen = () => {
                console.log("[SSE] Connection established");
                reconnectAttempts = 0;  // Reset reconnect attempts on successful connection
            };

            newEventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("[SSE] Received message:", data);
                    
                    switch (data.type) {
                        case "connection":
                            console.log("[SSE] Connection confirmed");
                            break;

                        case "kg_update":
                            if (data.data && Array.isArray(data.data.nodes)) {
                                // Use functional update to ensure we have latest state
                                setKgData(prevKG => {
                                    const newKgData = {
                                        nodes: [...(prevKG?.nodes || []), ...data.data.nodes],
                                        edges: [...(prevKG?.edges || []), ...data.data.edges],
                                        articles: [...(prevKG?.articles || []), data.data.article],
                                        summary: prevKG?.summary || "",
                                        // Add updateId to force re-render
                                        updateId: Date.now()
                                    };
                                    
                                    console.log("[App] Setting new KG state:", {
                                        timestamp: new Date().toISOString(),
                                        prevNodes: prevKG?.nodes.length || 0,
                                        newNodes: newKgData.nodes.length,
                                        updateId: newKgData.updateId
                                    });
                                    
                                    return newKgData;
                                });
                            }
                            break;

                        case "complete":
                            console.log("[SSE] Generation complete");
                            setCompletedSteps(prev => ({ ...prev, generate: true }));
                            setGenerationProgress(null);
                            setIsLoading(false);
                            newEventSource.close();
                            setEventSource(null);
                            break;

                        case "error":
                            console.error("[SSE] Server error:", data.message);
                            setIsLoading(false);
                            newEventSource.close();
                            setEventSource(null);
                            break;
                    }
                } catch (error) {
                    console.error("[SSE] Message parsing error:", error);
                }
            };

            newEventSource.onerror = (error) => {
                console.error("[SSE] Connection error:", error);
                
                if (newEventSource.readyState === EventSource.CLOSED) {
                    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        reconnectAttempts++;
                        console.log(`[SSE] Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                        setTimeout(() => {
                            newEventSource.close();
                            setEventSource(null);
                            handleGenerateKG();
                        }, 2000);
                    } else {
                        console.error("[SSE] Max reconnection attempts reached");
                        setIsLoading(false);
                        setGenerationProgress(null);
                        newEventSource.close();
                        setEventSource(null);
                    }
                }
            };

            setEventSource(newEventSource);

        } catch (error) {
            console.error("[SSE] Setup error:", error);
            setIsLoading(false);
            setGenerationProgress(null);
        }
    };

    const handleQueryResult = (result: QueryResponse) => {
        console.log("Query Result:", result);
        setQueryResponse(result);
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
            setSelectedNodes(new Set(response.kg.nodes.map(node => node.id)));
            setCompletedSteps(prev => ({ ...prev, enrich: true }));
        } catch (error) {
            console.error("Error enriching KG:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuerySubmit = async () => {
        if (!kgId || !query.trim() || !kgData) return;
        
        setIsLoading(true);
        try {
            // Use all nodes if none are explicitly selected
            const nodesToQuery = selectedNodes.size > 0 
                ? Array.from(selectedNodes)
                : kgData.nodes.map(node => node.id);

            const result = await queryKG(
                kgId,
                query,
                5,
                1,
                nodesToQuery
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
        if (!kgData) return [];
        
        // If no nodes are explicitly selected or selectedNodes is empty, return all articles
        if (selectedNodes.size === 0) {
            return kgData.articles;
        }

        // Get unique articles from all selected nodes
        const selectedArticleUrls = new Set<string>();
        Array.from(selectedNodes).forEach(nodeId => {
            const node = kgData.nodes.find(node => node.id === nodeId);
            if (node) {
                node.articles.forEach(url => selectedArticleUrls.add(url));
            }
        });

        // Filter articles based on the collected URLs
        return kgData.articles.filter(article => 
            selectedArticleUrls.has(article.url)
        );
    };

    /* Main components */
    return (
        <Box sx={{
            display: "flex",
            minHeight: "100vh",
            width: "100%",
            bgcolor: "background.default",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* Main Content Area */}
            <Box sx={{
                flexGrow: 1,
                width: "100%",
                height: "100vh",
                transition: "all 0.3s ease-in-out",
                marginRight: isRightPanelOpen ? "400px" : 0,
                marginLeft: isLeftPanelOpen ? "400px" : 0,
                display: "flex",
                flexDirection: "column",
                pt: 2,
                px: 8,
                overflow: "auto"
            }}>
                {/* Header */}
                <Box sx={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    mb: 2,
                    pb: 2,
                    borderBottom: 1,
                    borderColor: "divider"
                }}>
                    <IconButton 
                        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                        size="small"
                    >
                        <KeyboardDoubleArrowLeftIcon 
                            sx={{ 
                                transform: isLeftPanelOpen ? "rotate(0deg)" : "rotate(180deg)",
                                transition: "transform 0.3s"
                            }}
                        />
                    </IconButton>
                    <Typography variant="h6">
                        GRAPH & ASK
                    </Typography>
                    <IconButton 
                        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                        size="small"
                    >
                        <KeyboardDoubleArrowLeftIcon 
                            sx={{ 
                                transform: isRightPanelOpen ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.3s"
                            }}
                        />
                    </IconButton>
                </Box>

                <Drawer
                    anchor="left"
                    open={isLeftPanelOpen}
                    onClose={() => setIsLeftPanelOpen(false)}
                    variant="persistent"
                    PaperProps={{
                        sx: {
                            width: "400px",
                            position: "fixed",
                            height: "100%",
                            top: 0,
                            pt: 2,
                            px: 2,
                            transition: "transform 0.3s ease-in-out",
                            transform: isLeftPanelOpen ? "translateX(0)" : "translateX(-100%)",
                            overflowY: "auto",
                            // borderRight: 1,
                            // borderColor: "divider",
                            // mr: 2
                        }
                    }}
                >
                    <Box sx={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        mb: 2,
                        position: "sticky",
                        top: 0,
                        bgcolor: "background.paper",
                        zIndex: 1,
                        py: 1
                    }}>
                        <Typography variant="h6">How to Use</Typography>
                        <IconButton 
                            onClick={() => setIsLeftPanelOpen(false)}
                            size="small"
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    
                    <List sx={{ px: 0 }}>
                        <ListItem sx={{ mb: 3 }}>
                            <ListItemIcon>
                                <LooksOneIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Generate Knowledge Graph"
                                secondary="Generate knowledge graphs from news articles. Use side panel to view news summaries and their associated knowledge graphs."
                            />
                        </ListItem>
                        
                        <ListItem sx={{ mb: 3 }}>
                            <ListItemIcon>
                                <LooksTwoIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Enrich Knowledge Graph"
                                secondary="Enrich with semantic information and combine all knowledge graphs. Use side panel to see overall summary."
                            />
                        </ListItem>
                        
                        <ListItem>
                            <ListItemIcon>
                                <Looks3Icon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Query Knowledge Graph"
                                secondary="Query the combined knowledge graph to retrieve relevant information, and generate answer."
                            />
                        </ListItem>
                    </List>
                </Drawer>

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
                                {isLoading ? (
                                    generationProgress 
                                        ? `Generating (${generationProgress.current}/${generationProgress.total})`
                                        : "Generating..."
                                ) : "Generate"}
                            </Typography>
                            {isLoading && (
                                <CircularProgress
                                    variant={generationProgress ? "determinate" : "indeterminate"}
                                    value={generationProgress 
                                        ? (generationProgress.current / generationProgress.total) * 100 
                                        : undefined}
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
                                height: "600px",
                            }}>
                                <Box sx={{ 
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    height: "100%",
                                    overflow: "hidden"
                                }}>
                                    <GraphVisualization 
                                        data={kgData}
                                        selectedNodes={selectedNodes}
                                        onNodeClick={(nodeId: string, isMultiSelect?: boolean) => {
                                            if (isMultiSelect) {
                                                const newSelectedNodes = new Set(selectedNodes);
                                                if (newSelectedNodes.has(nodeId)) {
                                                    newSelectedNodes.delete(nodeId);
                                                    setSelectedNodeId(null);
                                                } else {
                                                    newSelectedNodes.add(nodeId);
                                                    setSelectedNodeId(nodeId);
                                                }
                                                setSelectedNodes(newSelectedNodes);
                                            } else {
                                                setSelectedNodes(new Set([nodeId]));
                                                setSelectedNodeId(nodeId);
                                            }
                                        }}
                                        onSelectionClear={() => {
                                            setSelectedNodes(new Set());
                                            setSelectedNodeId(null);
                                        }}
                                    />
                                </Box>
                            </Box>
                                <Box sx={{ mt: 2, mb: 2 }}>
                                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: "block" }}>
                                        Context Nodes ({selectedNodes.size})
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {Array.from(selectedNodes).map((nodeId) => (
                                            <Chip
                                                key={nodeId}
                                                // label={getNodeLabel(nodeId)}
                                                label={nodeId}
                                                onDelete={() => {
                                                    const newSelectedNodes = new Set(selectedNodes);
                                                    newSelectedNodes.delete(nodeId);
                                                    setSelectedNodes(newSelectedNodes);
                                                }}
                                                size="small"
                                                sx={{ mb: 1 }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                        </Box>
                    )}
                    <Drawer
                        anchor="right"
                        open={isRightPanelOpen}
                        onClose={() => setIsRightPanelOpen(false)}
                        variant="persistent"
                        PaperProps={{
                            sx: {
                                width: "400px",
                                position: "fixed",
                                height: "100%",
                                top: 0,
                                pt: 2,
                                px: 2,
                                transition: "transform 0.3s ease-in-out",
                                transform: isRightPanelOpen ? "translateX(0)" : "translateX(100%)",
                                overflowY: "auto"
                            }
                        }}
                    >
                        <Box sx={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            mb: 2,
                            position: "sticky",
                            top: 0,
                            bgcolor: "background.paper",
                            zIndex: 1,
                            py: 1
                        }}>
                            <Typography variant="subtitle2">
                                {selectedNodes.size > 0 && `${selectedNodes.size} nodes in context`}
                            </Typography>
                            <IconButton 
                                onClick={() => setIsRightPanelOpen(false)}
                                size="small"
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        
                        {kgData && Array.from(selectedNodes).map(nodeId => {
                            const node = kgData.nodes.find(n => n.id === nodeId);
                            if (!node) return null;
                            return (
                                <Box key={nodeId} sx={{ 
                                    mb: 1,
                                    pb: 0,
                                    borderBottom: "1px solid",
                                    borderColor: "lightgray"
                                }}>
                                    <Box sx={{ 
                                        display: "flex", 
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        mb: 0
                                    }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            <b>{node.id}</b>
                                        </Typography>
                                        <IconButton 
                                            size="small"
                                            onClick={() => {
                                                const newSelectedNodes = new Set(selectedNodes);
                                                newSelectedNodes.delete(nodeId);
                                                setSelectedNodes(newSelectedNodes);
                                                if (selectedNodeId === nodeId) {
                                                    setSelectedNodeId(null);
                                                }
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    <NodeDetails node={node} />
                                </Box>
                            );
                        })}

                        {selectedNodes.size === 0 && (
                            <Typography color="text.secondary" sx={{ mt: 2 }}>
                                No nodes selected. Click on nodes in the graph to view their details.
                            </Typography>
                        )}

                        <ArticlePanel
                            articles={getRelevantArticles(selectedNodeId)}
                            selectedNodeId={selectedNodeId}
                            onClose={() => setSelectedNodeId(null)}
                            kgSummary={kgData?.summary}
                            isEnriched={completedSteps.enrich}
                            queryResponse={queryResponse}
                            currentQuery={query}
                        />
                    </Drawer>
                </Box>
            </Box>
        </Box>
    );
};

export default App;
