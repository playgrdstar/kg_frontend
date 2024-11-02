/**
 * API service for interacting with the Knowledge Graph backend
 */

import axios from "axios";
import { KnowledgeGraphResponse, QueryResult } from "../types/api.types";

const API_BASE_URL = "/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const generateKG = async (
    tickers: string = 'AAPL',
    window: number = 1,
    limit: number = 1
): Promise<KnowledgeGraphResponse> => {
    const response = await api.post("/generate", {
        tickers,
        window,
        limit,
    });
    return response.data;
};

export const enrichKG = async (
    kg_ids: string[]
): Promise<KnowledgeGraphResponse> => {
    const response = await api.post("/enrich", {
        kg_ids,
    });
    return response.data;
};

export const queryKG = async (
    kg_id: string,
    query: string,
    top_n: number = 5,
    connected_hops: number = 1
): Promise<QueryResult> => {
    const response = await api.post("/query", {
        kg_id,
        query,
        top_n,
        connected_hops,
    });
    return response.data;
}; 