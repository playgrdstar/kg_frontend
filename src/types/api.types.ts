/**
 * Type definitions for API responses and requests
 */

export interface Article {
    title: string;
    summary: string;
    url: string;
}

export interface KGNode {
    id: string;
    type: string;
    detailed_type: string;
    summary: string | null;
    network_embedding: number[] | null;
    text_embedding: number[] | null;
    community: number | null;
    articles: string[];
}

export interface KGEdge {
    source: string;
    target: string;
    label: string;
    count: number;
}

export interface KnowledgeGraph {
    nodes: KGNode[];
    edges: KGEdge[];
    articles: Article[];
    summary: string;
}

export interface KnowledgeGraphResponse {
    kg_id: string;
    kg: KnowledgeGraph;
}

export interface QueryAnswer {
    answer: string;
    evidence: string[];
    connections: string[];
    sources: string[];
    key_entities: string[];
    metadata: {
        confidence_scores: {
            text_similarity: number;
            entity_similarity: number;
            connection_strength: number;
        };
        query_stats: {
            matched_nodes: number;
            related_entities: number;
            connected_nodes: number;
        };
    };
}

export interface QueryResult {
    query_results: {
        similar_by_text: Array<{
            node: KGNode;
            similarity: number;
        }>;
        similar_by_entities: Array<{
            node: KGNode;
            similarity: number;
        }>;
        connected_entities: Array<{
            node: KGNode;
            similarity: number;
        }>;
    };
    answer: QueryAnswer;
} 