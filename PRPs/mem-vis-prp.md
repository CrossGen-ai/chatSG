# Memory Management Feature - Product Requirements Document

## Overview
Add a memory management interface to our single-page web application that allows users to view and interact with their chat system memories stored across multiple database types (Qdrant, Neo4j, Postgres, JSONL). The feature will translate technical database storage into human-friendly memory categories.

## Core Functionality

### Memory Access Panel
- **Icon**: Brain icon on left-hand vertical sidebar
- **Behavior**: Clicking opens slide-out panel with same mechanics as existing sidebar panels (pinning, sliding, persistence)
- **Memory Categories**: Display memories categorized as:
  - **Short-term** → Postgres session storage
  - **Semantic** → Neo4j graph relationships  
  - **Long-term** → Qdrant vector storage

### User Access Control
**Regular Users:**
- Display only memories associated with their user ID
- No access to other users' memory data

**Admin Users:**
- User dropdown selector in slide-out panel
- Default selection: logged-in admin user
- Selection persists across database type navigation
- Reset to admin user when reopening panel

## Database-Specific Visualizations

### 1. Qdrant (long-term Memory)
- **Visualization**: Custom React scatter plot using **Cytoscape.js** or **D3.js**
- **Features**:
  - Interactive points representing vector embeddings
  - Hover tooltips showing all metadata fields
  - Zoom and pan capabilities
  - Read-only visualization
- **Data Display**: All vector metadata including user access rights

### 2. Neo4j (Semantic Memory) 
- **Visualization**: Custom interactive graph using **Cytoscape.js**
- **Features**:
  - Node-link diagram with labeled relationships
  - Hover tooltips for node/edge metadata
  - Graph layout algorithms (force-directed, hierarchical)
  - Read-only interaction
- **Data Display**: Node properties, relationship types, all graph metadata

### 3. Postgres (Short term Memory)
- **Visualization**: Responsive data table with session filtering
- **Features**:
  - Sortable columns
  - Search/filter functionality
  - Session dropdown filter with multiple criteria:
    - Session status (active, inactive, completed)
    - Session name
    - Date range (first chat to last chat datetime)
  - Pagination for large datasets
  - Row hover for additional details
  - Tabbed view or toggle between memory data and session data
- **Data Display**: All table columns, metadata, and session information

## Technical Implementation

### API Design
Create new REST endpoints (ensure proper registration):

```
GET /api/memories/qdrant/{user_id}        # Vector memories
GET /api/memories/neo4j/{user_id}         # Graph memories  
GET /api/memories/postgres/{user_id}      # Structured memories & sessions
GET /api/memories/postgres/sessions/{user_id} # Session-specific data
GET /api/users                            # For admin dropdown
```

### Frontend Architecture
- **Components**:
  - `MemoryPanel`: Main slide-out container
  - `MemoryTypeSelector`: Tab/navigation for memory categories
  - `QdrantVisualization`: Vector scatter plot component
  - `Neo4jVisualization`: Graph network component
  - `PostgresMemoryTable`: Data table component with session filtering
  - `AdminUserSelector`: User dropdown for admins

### Recommended Libraries
Based on research of 2025 React visualization libraries:

1. **Graph Visualization**: **Cytoscape.js** 
   - Excellent for both vector scatter plots and network graphs
   - Rich interaction capabilities with hover events
   - Performant for medium-sized datasets
   - Strong React integration

2. **Alternative**: **D3.js with React integration**
   - Maximum customization flexibility
   - Custom scatter plot implementations
   - Steeper learning curve but powerful

3. **Table Component**: **React Table** or custom table with sorting/filtering

4. **UI Framework**: Continue using existing design system for consistency

### Data Flow
1. User selects memory type (short-term, semantic, long-term)
2. API call fetches relevant data for selected user
3. Component renders appropriate visualization
4. For Postgres: Additional session filtering and tabbed views available
5. User interactions trigger hover events showing metadata
6. Admin user changes persist across navigation

### Performance Considerations
- Implement lazy loading for large datasets (future enhancement)
- Cache frequently accessed memory data
- Optimize graph layouts for smooth interactions
- Handle empty states gracefully

## User Experience

### Navigation Flow
1. User clicks brain icon in sidebar
2. Memory panel slides out showing default memory type
3. User can switch between memory categories (short-term, semantic, long-term)
4. Each category shows appropriate visualization
5. Postgres view includes session data with filtering options
6. Hover interactions reveal detailed metadata
7. Admin users can select different users via dropdown

### Responsive Design
- Panel adapts to screen size
- Visualizations scale appropriately  
- Mobile-friendly touch interactions
- Maintain accessibility standards

## Success Criteria
- ✅ Users can easily access and understand their memory data
- ✅ Visualizations clearly represent different memory types
- ✅ Admin functionality allows user memory inspection
- ✅ Performance remains smooth with typical memory datasets
- ✅ Interface integrates seamlessly with existing application design

## Future Enhancements (Out of Scope)
- Group-based memory access
- Memory editing capabilities
- Advanced filtering and search
- Memory export functionality
- Real-time memory updates
- Performance optimization for very large datasets

## Dependencies
- mem0 system integration
- Existing user authentication/authorization
- Current sidebar panel implementation
- Database connection libraries for each storage type

## Acceptance Criteria
- [ ] Brain icon added to left sidebar
- [ ] Slide-out panel with same behavior as existing panels
- [ ] Three memory type categories implemented (short-term, semantic, long-term)
- [ ] Interactive visualizations for each database type
- [ ] Postgres view includes session data with filtering capabilities
- [ ] Metadata hover tooltips functional
- [ ] Admin user selector working
- [ ] Session filtering by status and date range in Postgres view
- [ ] All new API endpoints created and registered
- [ ] Read-only access enforced
- [ ] User access control properly implemented