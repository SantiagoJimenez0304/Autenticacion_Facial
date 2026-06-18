# Graph Report - geo-face-app  (2026-06-18)

## Corpus Check
- 37 files · ~13,407 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 227 nodes · 366 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5a004087`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `expo` - 13 edges
2. `compilerOptions` - 13 edges
3. `COLORS` - 12 edges
4. `Zone` - 10 edges
5. `useApp()` - 9 edges
6. `secureSetItem()` - 8 edges
7. `FaceProfile` - 7 edges
8. `adaptiveIcon` - 5 edges
9. `represent()` - 5 edges
10. `scripts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `LocationTestScreen()` --calls--> `formatDistance()`  [EXTRACTED]
  app/(tabs)/location-test.tsx → src/utils/geo.ts
- `ProfileCardProps` --references--> `FaceProfile`  [EXTRACTED]
  src/components/ProfileCard.tsx → src/types/index.ts
- `AppContextType` --references--> `FaceProfile`  [EXTRACTED]
  src/context/AppContext.tsx → src/types/index.ts
- `AppContextType` --references--> `Zone`  [EXTRACTED]
  src/context/AppContext.tsx → src/types/index.ts
- `DashboardScreen()` --calls--> `useApp()`  [EXTRACTED]
  src/screens/DashboardScreen.tsx → src/context/AppContext.tsx

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (20): CheckInItem(), CheckInItemProps, ResultOverlay(), ResultOverlayProps, VerifyResult, StatsCardProps, BORDER_RADIUS, COLORS (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, typedRoutes, expo (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (23): styles, AppContext, AppContextType, AppProvider(), useLocation(), addCheckIn(), clearCheckIns(), deleteProfile() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (18): ZonesContext, ZonesContextType, DashboardScreen(), requestLocationPermissions(), watchLocation(), COLORS, DEMO_ZONE, LocationTestScreen() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (26): dependencies, async-storage, expo, expo-camera, expo-constants, expo-file-system, expo-font, expo-haptics (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (15): AVATAR_COLORS, getAvatarColor(), ProfileCard(), ProfileCardProps, useApp(), ProfilesScreen(), SettingsScreen(), VerifyScreen() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (17): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, jsx, lib, module, moduleResolution, paths (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (10): API_BASE, FaceApiError, getEmbedding(), healthCheck(), photoToBase64(), RepresentResponse, request(), verifyFace() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (13): devDependencies, @expo/ngrok, @types/react, typescript, main, name, private, scripts (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (6): _extract_image(), l2_normalize(), load_image_from_base64(), represent(), verify(), _warmup()

## Knowledge Gaps
- **101 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 4` to `Community 8`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Zone` connect `Community 3` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `COLORS` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09982174688057041 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1339031339031339 - nodes in this community are weakly interconnected._