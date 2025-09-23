# Process Mining Demo - Permit Application Analysis

A single-page React application demonstrating process mining functionality for permit application workflows.

## Latest Release: Professional Graph Layout & Bottleneck Controls ✅

**Features Implemented:**
- ✅ Event log generator with seeded randomization
- ✅ Sample datasets (200 and 2000 cases) with reproducible generation
- ✅ File upload and validation for custom event logs
- ✅ Variant extraction with performer analytics
- ✅ DFG (Directly-Follows Graph) processing
- ✅ Advanced metrics calculation and bottleneck detection
- ✅ Conservation checking with detailed diagnostics
- ✅ Performer analytics with workload distribution
- ✅ Tabbed analytics interface (Overview/Performance/Diagnostics)
- ✅ **Visual variant selection tiles with thumbnails**
- ✅ **Interactive React Flow process diagrams**
- ✅ **Industry-standard Sugiyama algorithm for graph layout**
- ✅ **Dynamic node sizing with intelligent spacing**
- ✅ **User-controlled bottleneck visualization**
- ✅ **Smart edge labels with hover tooltips**
- ✅ **Zero-overlap positioning system**

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Latest Features 🎉

### **Industry-Standard Graph Layout:**
- **🏗️ Sugiyama Algorithm** - Professional hierarchical graph layout via Dagre.js
- **📐 Dynamic Node Sizing** - Canvas-based text measurement for optimal widths
- **🧠 Complexity Analysis** - Graph metrics drive adaptive spacing (branching factor, depth, density)
- **🔧 Overlap Resolution** - Automatic iterative refinement with spacing adjustment
- **♾️ Future-Proof** - Scales to any graph structure without manual positioning

### **Advanced Bottleneck Controls:**
- **🎛️ User Toggle** - "Show Bottlenecks" button with consistent design aesthetic
- **🎨 Pastel Styling** - Soft pink-red colors (#fb7185) for professional appearance
- **💫 Animation & Dashing** - Blinking and dashed lines when bottlenecks are active
- **🔍 Intelligent Detection** - 90th percentile algorithm for high-impact slow transitions
- **⚡ Performance-Based** - Only shows bottlenecks affecting ≥10 cases with significant delays

### **Visual Variant Selection:**
- **🎨 Interactive variant tiles** with visual thumbnails and sparklines
- **📊 Single-select behavior** with automatic diagram updates
- **💡 Smart variant identification** from known process patterns
- **📈 Coverage analysis** showing top variant distribution

### **Interactive Process Diagrams:**
- **🔄 React Flow integration** with custom nodes and edges
- **🎯 Zero-overlap positioning** with systematic spacing algorithms
- **✋ Drag & drop positioning** with session persistence
- **🚨 On-demand bottleneck highlighting** controlled by user toggle
- **📏 Enhanced edge thickness** (2-4px) for better color visibility
- **💬 Hover tooltips** showing transition metrics

### **Advanced UI Features:**
- **🗺️ Mini-map navigation** for large process diagrams
- **🎛️ Zoom and pan controls** with fit-to-view
- **📋 Process info panel** with variant statistics
- **🔄 Layout reset button** to restore automatic positioning
- **⚠️ Zero overlap guarantee** with professional spacing

## Usage

1. **Load Data**:
   - Click "Small Dataset" or "Medium Dataset" for sample data
   - Or upload your own JSON file with event log format

2. **Generate Data**:
   - Use the Data Generator to create custom datasets
   - Adjust case count and random seed
   - Download generated datasets as JSON

3. **Select Process Variant**:
   - Browse visual variant tiles in the left panel
   - Click any tile to select and visualize that variant
   - See sparkline thumbnails and case counts per variant

4. **Explore Interactive Diagrams**:
   - View the selected variant's process flow with professional layout
   - Toggle "Show Happy Path" for green highlighting of optimal flow
   - Toggle "Show Bottlenecks" for pastel pink-red highlighting with animation
   - Drag nodes to customize the layout (saves automatically)
   - Hover over edges to see transition timing details
   - Use zoom, pan, and mini-map for navigation

5. **Analyze Performance**:
   - Switch to **Performance** tab for performer analytics
   - Identify bottleneck performers and workload distribution
   - View performance levels (Excellent/Good/Needs Attention)

6. **Validate Data**:
   - Switch to **Diagnostics** tab for conservation checking
   - See pass/fail status for each variant and node
   - Get detailed error messages and recommendations

7. **Monitor Process Health**:
   - Check Quick Stats sidebar for key indicators
   - View real-time bottleneck alerts highlighted on diagrams
   - Monitor conservation status (PASS/FAIL)

## Event Log Format

```json
{
  "events": [
    {
      "case_id": "PERMIT_2024_000001",
      "state": "submitted",
      "timestamp": "2024-06-01T09:00:00.000Z",
      "performer": null
    }
  ],
  "metadata": {
    "generated_at": "2024-06-01T08:00:00.000Z",
    "total_cases": 200,
    "seed": 12345
  }
}
```

## Permit Process States

1. **submitted** → 2. **intake_validation** → 3. **assigned_to_reviewer** → 4. **review_in_progress** → 5. **final_review** → 6. **approved/rejected**

**Variants:**
- **Happy Path** (60%): Direct approval path
- **Info Loop** (25%): Additional information requested
- **Rejected** (10%): Rejection at final review
- **Withdrawn** (5%): Applicant withdraws after info request

## Phase 3 Acceptance Criteria Results

- [x] **Variant tiles display correctly**: Visual tiles with sparklines, case counts, and selection highlighting
- [x] **Diagram shows correct topology**: Selected variants render with proper node/edge relationships
- [x] **Drag & drop persistence**: Manual positioning saves automatically per variant in session storage
- [x] **Edge labels accurate**: Hover tooltips show median times, edge thickness reflects case frequency
- [x] **Layout algorithm works**: Dagre produces non-overlapping initial layouts with minimal edge crossings
- [x] **Auto-selection functional**: First variant auto-selects when data loads
- [x] **Bottleneck highlighting**: Nodes and edges with bottlenecks show red styling and alerts

## Next Phase

**Phase 4**: Enhanced Process Analytics
- Advanced filtering and comparison tools
- Enhanced performer analytics and insights
- Additional process optimization features

## Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: React hooks with useMemo optimization
- **Analytics**: Custom process mining algorithms
- **Build**: Vite with TypeScript compilation
- **Deployment**: Static build ready for GitHub Pages/Vercel

## Project Structure

```
src/
├── components/          # UI components
│   ├── generator/       # Data generation UI
│   ├── layout/          # Layout components
│   └── metrics/         # Analytics and verification components
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Core algorithms (DFG, metrics, conservation)
└── constants/           # Process definitions
```

## Algorithm Details

### **Graph Layout (Sugiyama Method)**
The application implements the industry-standard **Sugiyama algorithm** for hierarchical graph layout:

- **4-Phase Process**: Cycle removal → Layer assignment → Crossing minimization → Coordinate assignment
- **Implementation**: Uses proven Dagre.js library with custom optimizations
- **Benefits**: Professional hierarchical layouts, minimal edge crossings, optimal readability
- **Adaptive Spacing**: Dynamic calculation based on node content and graph complexity

### **Process Mining Analytics**
- **DFG Construction**: O(n) event log processing with transition frequency counting
- **Variant Extraction**: Sequence hashing with performer breakdown analytics
- **Conservation Checking**: Flow balance validation for all nodes/variants
- **Bottleneck Detection**: Statistical analysis using 90th percentile thresholds + frequency impact
- **Metrics Calculation**: Comprehensive throughput and performance analysis

### **Layout Optimization**
```typescript
// 5-Phase systematic approach:
1. Foundation: Dagre.js integration
2. Dynamic Sizing: Canvas text measurement
3. Intelligent Spacing: nodesep/ranksep/edgesep calculation
4. Overlap Resolution: Iterative refinement
5. Complexity Analysis: Adaptive multipliers
```