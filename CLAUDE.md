# Claude Code Development Notes

## Development Commands

```bash
# Development
npm run dev          # Start development server (usually localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

## Current State: Modern UI Design

### Key Features
- **Fixed Dataset**: 3875 cases generated with seed 42 for reproducible demos
- **Modern UI**: Vercel-inspired design with rounded corners, light colors, clean styling
- **Variants Panel**: Top-right floating panel with percentage-ordered variants and "Show Happy Path" toggle
- **Custom Layout**: Optimized node positioning to minimize edge crossings
- **Happy Path Overlay**: Green highlighting for optimal process flow

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

### Layout Optimization
- **Custom Process Mining Layout**: Specialized positioning for permit workflow
- **Edge Crossing Minimization**: "Applicant Provided Info" positioned to right to avoid crossings
- **Semantic Positioning**: Nodes arranged based on process flow logic, not just automatic layout

## Process Mining Domain
- **Variants**: Unique activity sequences through the process (displayed by percentage)
- **Happy Path**: Optimal process flow highlighted in green when toggled
- **DFG**: Directly-follows graph with optimized edge routing
- commit every change in code with descriptive comment about the change