# Claude Code Development Notes

## Development Commands

```bash
# Development
npm run dev          # Start development server (usually localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

## Current State: Industry-Standard Graph Layout with Advanced Controls

### Key Features
- **Fixed Dataset**: 3875 cases generated with seed 42 for reproducible demos
- **Modern UI**: Vercel-inspired design with rounded corners, light colors, clean styling
- **Variants Panel**: Top-right floating panel with percentage-ordered variants and "Show Happy Path" toggle
- **Systematic Layout**: Industry-standard Sugiyama algorithm via Dagre.js for professional graph positioning
- **Happy Path Overlay**: Green highlighting for optimal process flow
- **Bottleneck Toggle**: User-controlled bottleneck visualization with pastel colors and animation

### Core Components
- **App.tsx**: Clean layout with proper margins, header section, and centered diagram container
- **VariantSelectionPanel**: Modern floating panel with compact variant tiles
- **CustomNode**: Ultra-modern design with rounded-3xl corners and light blue backgrounds
- **CustomEdge**: Thin, smooth edges with minimal visual noise
- **ProcessFlow**: React Flow diagram with custom layout for process mining

### UI Design Principles
- **Modern Aesthetics**: Light backgrounds, rounded corners, subtle shadows
- **Clean Typography**: Compact text with proper hierarchy
- **Minimal Visual Noise**: Removed unnecessary borders, icons, and complex colors
- **Responsive Layout**: Proper margins, not full-screen width
- **Process-Optimized**: Custom layout logic to minimize edge crossings

### Systematic Layout Implementation
- **Sugiyama Algorithm**: Industry-standard hierarchical graph layout via Dagre.js
- **Dynamic Node Sizing**: Canvas-based text measurement for optimal node width calculation
- **Complexity Analysis**: Graph metrics (branching factor, depth, density) for adaptive spacing
- **Overlap Resolution**: Automatic iterative refinement with spacing adjustment
- **Future-Proof**: Scales to any graph structure without manual positioning

## Process Mining Domain
- **Variants**: Unique activity sequences through the process (displayed by percentage)
- **Happy Path**: Optimal process flow highlighted in green when toggled
- **Bottleneck Detection**: Intelligent algorithm identifying 90th percentile slow transitions
- **DFG**: Directly-follows graph with optimized edge routing

## Technical Implementation Details

### Graph Layout System
The application uses a **5-phase systematic approach** for professional graph visualization:

1. **Phase 1 - Foundation**: Replaced hardcoded positioning with industry-standard Dagre.js (Sugiyama algorithm)
2. **Phase 2 - Dynamic Sizing**: Implemented canvas-based text measurement for variable node widths
3. **Phase 3 - Intelligent Spacing**: Algorithm calculates optimal `nodesep`, `ranksep`, and `edgesep` based on content
4. **Phase 4 - Overlap Resolution**: Automatic detection and iterative spacing adjustment (max 3 iterations)
5. **Phase 5 - Complexity Analysis**: Graph metrics drive adaptive spacing multipliers for any structure

### Bottleneck Analysis Algorithm
```typescript
// 90th percentile threshold for transition times
const p90Threshold = allTransitionTimes[Math.floor(allTransitionTimes.length * 0.9)];

// Bottleneck criteria (both must be met):
const isHighTime = transition.median_time_hours >= p90Threshold;
const isHighFrequency = variant.case_count >= 10; // Significant impact
```

### Layout Configuration
```typescript
dagreGraph.setGraph({
  rankdir: 'TB',
  nodesep: dynamicSpacing,    // Based on actual node widths
  ranksep: complexitySpacing, // Based on graph depth/branching
  edgesep: edgeSpacing       // For clean parallel edge routing
});
```

### Visual Controls
- **Show Happy Path**: Green highlighting for optimal process flow
- **Show Bottlenecks**: Pastel pink-red coloring with dashed lines and blinking animation
- **Reset Layout**: Restore automatic positioning with systematic spacing

- commit every change in code with descriptive comment about the change
- commit after every change with descriptive comments that makes it easy to follow changes