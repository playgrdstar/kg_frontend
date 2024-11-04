import React from "react";
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LooksOneIcon from "@mui/icons-material/LooksOne";
import LooksTwoIcon from "@mui/icons-material/LooksTwo";
import Looks3Icon from "@mui/icons-material/Looks3";

interface HelpPanelProps {
    open: boolean;
    onClose: () => void;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ open, onClose }) => {
    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { 
                    width: "400px",
                    pt: 2,
                    px: 6  // Increased padding
                }
            }}
        >
            <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                mb: 4,  // Increased margin
                pb: 2,
                borderBottom: 1,
                borderColor: "divider"
            }}>
                <Typography variant="h6">How to Use</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>
            
            <List sx={{ px: 0 }}>  {/* Remove default List padding */}
                <ListItem sx={{ mb: 3 }}>  {/* Added spacing between items */}
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
    );
};

export default HelpPanel;