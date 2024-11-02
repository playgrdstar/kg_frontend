import React from "react";
import {
    Box,
    Typography,
    Paper,
    Link,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
    Stack
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from '@mui/icons-material/Refresh';

interface Article {
    title: string;
    summary: string;
    url: string;
}

/**
 * Props for the ArticlePanel component
 */
interface ArticlePanelProps {
    /** List of articles to display */
    articles: Article[];
    /** Callback function to close the panel */
    onClose?: () => void;
    /** ID of the selected node, null if no node is selected */
    selectedNodeId: string | null;
    /** Overall summary of the knowledge graph */
    kgSummary?: string;
    /** Whether the graph has been enriched */
    isEnriched: boolean;
}

const ArticlePanel: React.FC<ArticlePanelProps> = ({
    articles,
    onClose,
    selectedNodeId,
    kgSummary,
    isEnriched
}) => {
    return (
        <Paper
            elevation={3}
            sx={{
                width: "400px",
                height: "100%",
                overflow: "auto",
                borderRadius: "8px",
                p: 2
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                    {selectedNodeId ? `Articles for ${selectedNodeId}` : "Knowledge Graph Summary"}
                </Typography>
                {onClose && (
                    <IconButton onClick={onClose} size="small">
                        <RefreshIcon />
                    </IconButton>
                )}
            </Stack>

            {/* Show KG summary after enrichment */}
            {isEnriched && kgSummary && !selectedNodeId && (
                <Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Overall Summary
                    </Typography>
                    <Typography variant="body2">
                        {kgSummary}
                    </Typography>
                </Box>
            )}
            
            {/* Show articles section */}
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {selectedNodeId ? "Related Articles" : "All Articles"}
            </Typography>
            
            {articles.length === 0 ? (
                <Typography variant="body2" sx={{ textAlign: "center", py: 2 }}>
                    No articles found for this node.
                </Typography>
            ) : (
                <List>
                    {articles.map((article, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <Divider sx={{ my: 2 }} />}
                            <ListItem sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                                    {article.title}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    {article.summary}
                                </Typography>
                                <Link
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ color: "primary.main" }}
                                >
                                    View Source
                                </Link>
                            </ListItem>
                        </React.Fragment>
                    ))}
                </List>
            )}
        </Paper>
    );
};

export default ArticlePanel; 