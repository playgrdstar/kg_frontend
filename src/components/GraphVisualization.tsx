import React, { useEffect, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Core, NodeSingular, EventObject } from "cytoscape";
import { KnowledgeGraph, KGNode, KGEdge } from "../types/api.types";

interface GraphVisualizationProps {
    data: KnowledgeGraph;
    onNodeClick?: (nodeId: string) => void;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
    data,
    onNodeClick,
}) => {
    const cyRef = useRef<Core | null>(null);

    const elements = React.useMemo(() => {
        console.log("Processing graph data:", data);
        
        const nodes = data.nodes.map((node: KGNode) => {
            console.log("Processing node:", node.id);
            return {
                data: { 
                    id: node.id, 
                    label: node.id,
                    type: node.type,
                    articles: node.articles
                },
                style: {
                    width: 20 + node.articles.length * 2,
                    height: 20 + node.articles.length * 2,
                },
            };
        });

        const edges = data.edges.filter(edge => {
            const isValid = nodes.some(n => n.data.id === edge.source) && 
                          nodes.some(n => n.data.id === edge.target);
            if (!isValid) {
                console.warn(`Invalid edge: ${edge.source} -> ${edge.target}`);
            }
            return isValid;
        }).map((edge: KGEdge) => ({
            data: { 
                id: `${edge.source}-${edge.target}`,
                source: edge.source, 
                target: edge.target, 
                label: edge.label 
            },
        }));

        console.log("Processed elements:", { nodes, edges });
        return [...nodes, ...edges];
    }, [data]);

    const handleCyInit = (cy: Core): void => {
        console.log("Cytoscape initialized with elements:", cy.elements().length);
        cyRef.current = cy;
        
        cy.on("tap", "node", (event: EventObject) => {
            const target = event.target as NodeSingular;
            const nodeId = target.id();
            console.log("Node clicked:", nodeId);
            onNodeClick?.(nodeId);
        });
    };

    useEffect(() => {
        if (cyRef.current) {
            const layout = cyRef.current.layout({
                name: "cose",
                animate: false,
                randomize: true,
                componentSpacing: 100,
                nodeRepulsion: () => 400000,
                idealEdgeLength: () => 50,
                edgeElasticity: () => 100,
                nestingFactor: 1.2,
                gravity: 80,
                numIter: 1000,
                initialTemp: 200,
                coolingFactor: 0.95,
                minTemp: 1.0
            });
            
            layout.run();
        }
    }, [elements]);

    return (
        <CytoscapeComponent
            elements={elements}
            style={{ width: "100%", height: "100%", backgroundColor: "white" }}
            cy={handleCyInit}
            layout={{ name: "preset" }}
        />
    );
};

export default GraphVisualization;