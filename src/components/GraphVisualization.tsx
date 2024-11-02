import React, { useEffect, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Core } from "cytoscape";
import { KnowledgeGraph, KGNode, KGEdge } from "../types/api.types";
import { cosineSimilarity } from "../utils/math";

interface GraphVisualizationProps {
    data: KnowledgeGraph;
    onNodeClick?: (nodeId: string) => void;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
    data,
    onNodeClick,
}) => {
    const cyRef = useRef<Core | null>(null);

    // Function to calculate similar nodes based on embeddings
    const getSimilarNodes = (node: KGNode, nodes: KGNode[], threshold: number = 0.8) => {
        if (!node.network_embedding || !node.text_embedding) return new Set<string>();
        
        return new Set(nodes.filter(n => {
            if (!n.network_embedding || !n.text_embedding) return false;
            
            // Type assertion since we've already checked for null
            const networkSimilarity = cosineSimilarity(
                node.network_embedding as number[],
                n.network_embedding as number[]
            );
            const textSimilarity = cosineSimilarity(
                node.text_embedding as number[],
                n.text_embedding as number[]
            );
            
            return n.id !== node.id && 
                (networkSimilarity > threshold || textSimilarity > threshold);
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

    // Convert graph data to Cytoscape elements
    const getElements = () => {
        const nodes = data.nodes.map(node => ({
            data: {
                id: node.id,
                label: node.type,
                width: 30,
                height: 30,
            }
        }));

        const edges = data.edges.map(edge => ({
            data: {
                id: `${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                label: edge.label
            }
        }));

        return [...nodes, ...edges];
    };

    const handleNodeSelection = (nodeId: string) => {
        if (!cyRef.current) return;

        const cy = cyRef.current;
        const selectedNode = data.nodes.find(n => n.id === nodeId);
        if (!selectedNode) return;

        // Reset all nodes to default style
        cy.nodes().removeClass('connected similar-embedding same-community selected');
        cy.nodes().style({
            'background-color': '#666',
            'border-width': 2,
            'border-color': '#666',
            'opacity': 0.3
        });

        // Get different node sets
        const connectedNodes = getConnectedNodes(nodeId, data.edges);
        const communityNodes = getCommunityNodes(selectedNode, data.nodes);
        const similarNodes = getSimilarNodes(selectedNode, data.nodes);

        // Apply styles to different node categories
        cy.nodes().forEach(node => {
            const id = node.id();
            if (id === nodeId) {
                node.addClass('selected');
                node.style({
                    'background-color': 'lightblue',
                    'border-color': 'lightblue',
                    'opacity': 1
                });
            } else if (connectedNodes.has(id)) {
                node.addClass('connected');
                node.style({
                    'background-color': 'lightblue',
                    'border-color': 'lightblue',
                    'opacity': 0.8
                });
            } else if (communityNodes.has(id)) {
                node.addClass('same-community');
                node.style({
                    'background-color': 'orange',
                    'border-color': 'orange',
                    'opacity': 0.8
                });
            } else if (similarNodes.has(id)) {
                node.addClass('similar-embedding');
                node.style({
                    'background-color': 'pink',
                    'border-color': 'pink',
                    'opacity': 0.8
                });
            }
        });

        // Highlight relevant edges
        cy.edges().style({ 'opacity': 0.2 });
        cy.edges().filter(edge => 
            edge.source().id() === nodeId || 
            edge.target().id() === nodeId
        ).style({ 'opacity': 1 });
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

        cy.on('tap', 'node', (event) => {
            const nodeId = event.target.id();
            handleNodeSelection(nodeId);
            onNodeClick?.(nodeId);
        });

        cy.on('tap', function(event) {
            if (event.target === cy) {
                // Clicked on background - reset styles
                cy.nodes().removeClass('connected similar-embedding same-community selected');
                cy.nodes().style({
                    'background-color': '#666',
                    'border-width': 2,
                    'border-color': '#666',
                    'opacity': 1
                });
                cy.edges().style({ 'opacity': 1 });
            }
        });
    };

    return (
        <CytoscapeComponent
            elements={getElements()}
            style={{ width: "100%", height: "100%" }}
            cy={handleCyInit}
            layout={{ name: "cose", animate: false }}
        />
    );
};

export default GraphVisualization;