import React, { useState } from "react";
import {
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
} from "@mui/material";
import { QueryResult } from "../types/api.types";
import { queryKG } from "../services/api";

interface QueryInterfaceProps {
    kgId: string;
    onQueryResult?: (result: QueryResult) => void;
}

const QueryInterface: React.FC<QueryInterfaceProps> = ({ kgId, onQueryResult }) => {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await queryKG(kgId, query);
            onQueryResult?.(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
                fullWidth
                label="Enter your query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                margin="normal"
                multiline
                rows={2}
            />
            {error && (
                <Typography color="error" sx={{ mt: 1 }}>
                    {error}
                </Typography>
            )}
            <Button
                type="submit"
                variant="contained"
                disabled={loading || !query.trim()}
                sx={{ mt: 2 }}
            >
                {loading ? <CircularProgress size={24} /> : "Submit Query"}
            </Button>
        </Box>
    );
};

export default QueryInterface; 