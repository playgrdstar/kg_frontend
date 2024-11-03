import React, { useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Core } from "cytoscape";
import { 
    Box, 
    Slider, 
    Typography, 
    Stack 
} from "@mui/material";
import { KnowledgeGraph, KGNode, KGEdge } from "../types/api.types";
import { cosineSimilarity } from "../utils/math";

interface GraphVisualizationProps {
    data: KnowledgeGraph;
    selectedNodes: Set<string>;
    onNodeClick: (nodeId: string, isMultiSelect?: boolean) => void;
    onSelectionClear: () => void;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
    data,
    selectedNodes,
    onNodeClick,
    onSelectionClear,
}) => {
    const cyRef = useRef<Core | null>(null);
    const [networkThreshold, setNetworkThreshold] = useState<number>(0.8);
    const [textThreshold, setTextThreshold] = useState<number>(0.8);

    // Update getSimilarNodes to use separate thresholds
    const getSimilarNodes = (node: KGNode, nodes: KGNode[]) => {
        if (!node.network_embedding || !node.text_embedding) return new Set<string>();
        
        return new Set(nodes.filter(n => {
            if (!n.network_embedding || !n.text_embedding) return false;
            
            const networkSimilarity = cosineSimilarity(
                node.network_embedding as number[],
                n.network_embedding as number[]
            );
            const textSimilarity = cosineSimilarity(
                node.text_embedding as number[],
                n.text_embedding as number[]
            );
            
            return n.id !== node.id && 
                (networkSimilarity > networkThreshold || 
                 textSimilarity > textThreshold);
        }).map(n => n.id));
    };

    // Function to get directly connected nodes
    const getConnectedNodes = (nodeId: string, edges: KGEdge[]) => {
        return new Set(edges
            .filter(edge => edge.source === nodeId || edge.target === nodeId)
            .map(edge => edge.source === nodeId ? edge.target : edge.source));
    };

    // Function to get nodes in the same community
    const getCommunityNodes = (node: KGNode, nodes: KGNode[]) => {
        if (node.community === null) return new Set<string>();
        
        return new Set(nodes
            .filter(n => 
                n.id !== node.id && 
                n.community !== null && 
                n.community === node.community
            )
            .map(n => n.id));
    };

    // Convert graph data to Cytoscape elements with validation
    const getElements = () => {
        // Create a Set of valid node IDs for quick lookup
        const validNodeIds = new Set(data.nodes.map(node => node.id));

        // Filter and map nodes
        const nodes = data.nodes.map(node => ({
            data: {
                id: node.id,
                label: node.id,
                width: 30,
                height: 30,
            }
        }));

        // Filter and map edges, excluding those with invalid source/target
        const edges = data.edges.filter(edge => {
            const isValid = validNodeIds.has(edge.source) && validNodeIds.has(edge.target);
            if (!isValid) {
                console.warn(
                    `Skipping invalid edge: ${edge.source} -> ${edge.target}`,
                    `Label: ${edge.label}`,
                    `Reason: ${!validNodeIds.has(edge.source) ? 'Invalid source' : 'Invalid target'}`
                );
            }
            return isValid;
        }).map(edge => ({
            data: {
                id: `${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                label: edge.label
            }
        }));

        return [...nodes, ...edges];
    };

    const handleNodeSelection = (nodeId: string, isMultiSelect: boolean = false) => {
        console.log("Node selected:", {
            nodeId,
            isMultiSelect,
            originalNode: data.nodes.find(n => n.id === nodeId)
        });
        
        if (!cyRef.current) return;

        const cy = cyRef.current;
        const selectedNode = data.nodes.find(n => n.id === nodeId);
        if (!selectedNode) return;

        // Update selected nodes set
        const newSelectedNodes = new Set(isMultiSelect ? selectedNodes : []);
        if (selectedNodes.has(nodeId) && isMultiSelect) {
            newSelectedNodes.delete(nodeId);
        } else {
            newSelectedNodes.add(nodeId);
        }

        // Reset all nodes to default style
        cy.nodes().removeClass("connected similar-embedding same-community selected");
        cy.nodes().style({
            "background-color": "#666",
            "border-width": 2,
            "border-color": "#666",
            "opacity": 0.3
        });

        // Style for all selected nodes and their related nodes
        newSelectedNodes.forEach(selectedId => {
            const node = data.nodes.find(n => n.id === selectedId);
            if (!node) return;

            const connectedNodes = getConnectedNodes(selectedId, data.edges);
            const communityNodes = getCommunityNodes(node, data.nodes);
            const similarNodes = getSimilarNodes(node, data.nodes);

            // Apply styles
            cy.nodes().forEach(cyNode => {
                const id = cyNode.id();
                if (newSelectedNodes.has(id)) {
                    cyNode.addClass("selected");
                    cyNode.style({
                        "background-color": "lightblue",
                        "border-color": "lightblue",
                        "opacity": 1
                    });
                } else if (connectedNodes.has(id)) {
                    cyNode.addClass("connected");
                    cyNode.style({
                        "background-color": "lightblue",
                        "border-color": "lightblue",
                        "opacity": 0.8
                    });
                } else if (communityNodes.has(id)) {
                    cyNode.addClass("same-community");
                    cyNode.style({
                        "background-color": "orange",
                        "border-color": "orange",
                        "opacity": 0.8
                    });
                } else if (similarNodes.has(id)) {
                    cyNode.addClass("similar-embedding");
                    cyNode.style({
                        "background-color": "pink",
                        "border-color": "pink",
                        "opacity": 0.8
                    });
                }
            });
        });

        // Highlight edges connected to any selected node
        cy.edges().style({ "opacity": 0.2 });
        cy.edges().filter(edge => 
            newSelectedNodes.has(edge.source().id()) || 
            newSelectedNodes.has(edge.target().id())
        ).style({ "opacity": 1 });

        // Call onNodeClick with the latest selected node
        onNodeClick?.(nodeId, isMultiSelect);
    };

    const handleCyInit = (cy: Core): void => {
        cyRef.current = cy;

        cy.style([
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': '#666',
                    'border-width': 2,
                    'border-color': '#666',
                    'width': 'data(width)',
                    'height': 'data(height)',
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(label)',
                    'font-size': '8px',
                    'text-rotation': 'autorotate',
                }
            }
        ]);

        cy.on("tap", "node", (event) => {
            const nodeId = event.target.id();
            handleNodeSelection(nodeId, event.originalEvent.shiftKey);
        });

        cy.on("tap", function(event) {
            if (event.target === cy) {
                // Clicked on background - reset styles and clear selection
                cy.nodes().removeClass("connected similar-embedding same-community selected");
                cy.nodes().style({
                    "background-color": "#666",
                    "border-width": 2,
                    "border-color": "#666",
                    "opacity": 1
                });
                cy.edges().style({ "opacity": 1 });
                onSelectionClear();
            }
        });
    };

    // Add error boundary for Cytoscape component
    const handleError = (error: any) => {
        console.error("Error in graph visualization:", error);
        // You could set an error state here if you want to show an error message to the user
    };

    // Validate graph data before rendering
    const validateGraphData = () => {
        if (!data.nodes || !Array.isArray(data.nodes)) {
            throw new Error("Invalid nodes data");
        }
        if (!data.edges || !Array.isArray(data.edges)) {
            throw new Error("Invalid edges data");
        }
        
        // Check for duplicate node IDs
        const nodeIds = new Set<string>();
        data.nodes.forEach(node => {
            if (nodeIds.has(node.id)) {
                console.warn(`Duplicate node ID found: ${node.id}`);
            }
            nodeIds.add(node.id);
        });
    };

    // Wrap the render in try-catch
    try {
        validateGraphData();
        
        return (
            <Box>
                <Stack spacing={2} sx={{ mt: 2, mb: 2, ml: 4, mr: 4 }}>
                    <Box>
                        <Typography variant="subtitle2">
                            Network Similarity: {networkThreshold.toFixed(2)}
                        </Typography>
                        <Slider
                            value={networkThreshold}
                            onChange={(_, value) => {
                                setNetworkThreshold(value as number);
                                // Reapply highlighting if a node is selected
                                const selectedNode = cyRef.current?.nodes('.selected').first();
                                if (selectedNode) {
                                    handleNodeSelection(selectedNode.id());
                                }
                            }}
                            min={0}
                            max={1}
                            step={0.05}
                            marks={[
                                { value: 0, label: '0' },
                                { value: 0.5, label: '0.5' },
                                { value: 1, label: '1' }
                            ]}
                            sx={{
                                width: "100%",
                                '& .MuiSlider-thumb': {
                                    backgroundColor: 'gray',
                                },
                                '& .MuiSlider-track': {
                                    backgroundColor: 'gray',
                                },
                                '& .MuiSlider-rail': {
                                    backgroundColor: 'gray',
                                }
                            }}
                        />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2">
                            Text Similarity: {textThreshold.toFixed(2)}
                        </Typography>
                        <Slider
                            value={textThreshold}
                            onChange={(_, value) => {
                                setTextThreshold(value as number);
                                // Reapply highlighting if a node is selected
                                const selectedNode = cyRef.current?.nodes('.selected').first();
                                if (selectedNode) {
                                    handleNodeSelection(selectedNode.id());
                                }
                            }}
                            min={0}
                            max={1}
                            step={0.05}
                            marks={[
                                { value: 0, label: '0' },
                                { value: 0.5, label: '0.5' },
                                { value: 1, label: '1' }
                            ]}
                            sx={{
                                width: "100%",
                                '& .MuiSlider-thumb': {
                                    backgroundColor: 'gray',
                                },
                                '& .MuiSlider-track': {
                                    backgroundColor: 'gray',
                                },
                                '& .MuiSlider-rail': {
                                    backgroundColor: 'gray',
                                }
                            }}
                        />
                    </Box>
                </Stack>

                <Box sx={{ 
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    overflow: "hidden",
                    height: "600px",
                    position: "relative"
                }}>
                    <CytoscapeComponent
                        elements={getElements()}
                        style={{ width: "100%", height: "100%" }}
                        cy={handleCyInit}
                        layout={{ name: "cose", animate: false }}
                    />
                </Box>
            </Box>
        );
    } catch (error) {
        console.error("Failed to render graph:", error);
        return (
            <Box sx={{ 
                p: 3, 
                border: "1px solid #ff0000", 
                borderRadius: "8px",
                bgcolor: "#fff5f5"
            }}>
                <Typography color="error" variant="h6">
                    Error Rendering Graph
                </Typography>
                <Typography color="error" variant="body2">
                    There was an error rendering the graph visualization. 
                    Please check the console for more details.
                </Typography>
            </Box>
        );
    }
};

export default GraphVisualization;