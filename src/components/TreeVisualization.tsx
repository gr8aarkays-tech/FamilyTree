import { useEffect, useRef, useState, useCallback, type WheelEvent, type MouseEvent, type TouchEvent } from 'react';
import type { Person, Relationship } from '../types';
import { buildAdjacency, getRelationMeta } from '../services/relationshipEngine';
import { useSettings } from '../contexts/SettingsContext';

/* ─── constants ─────────────────────────────────────────────── */
const NODE_W = 148;
const NODE_H = 100;
const H_GAP = 40;          // horizontal gap between sibling groups / nodes
const SPOUSE_GAP = 12;     // gap between husband & wife cards
const V_GAP = 90;          // vertical gap between generations

/* ─── Gender icon helpers ────────────────────────────────────── */
/** SVG symbol for the gender icon embedded inside the avatar circle */
function GenderSymbol({ gender, cx, cy }: { gender: string; cx: number; cy: number }) {
  if (gender === 'male') {
    // ♂ Mars symbol
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <circle r={5.5} fill="none" stroke="white" strokeWidth={1.5} />
        <line x1={3.8} y1={-3.8} x2={7} y2={-7} stroke="white" strokeWidth={1.5} />
        <line x1={4.5} y1={-7} x2={7} y2={-7} stroke="white" strokeWidth={1.5} />
        <line x1={7} y1={-7} x2={7} y2={-4.5} stroke="white" strokeWidth={1.5} />
      </g>
    );
  }
  if (gender === 'female') {
    // ♀ Venus symbol
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <circle r={5.5} fill="none" stroke="white" strokeWidth={1.5} />
        <line x1={0} y1={5.5} x2={0} y2={9} stroke="white" strokeWidth={1.5} />
        <line x1={-3} y1={7} x2={3} y2={7} stroke="white" strokeWidth={1.5} />
      </g>
    );
  }
  // other / unknown
  return (
    <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">?</text>
  );
}

/* ─── Types ──────────────────────────────────────────────────── */
interface TreeVisualizationProps {
  persons: Person[];
  relationships: Relationship[];
  anchorPersonId?: string;
  selectedPersonId?: string;
  onPersonClick: (personId: string) => void;
}

interface LayoutNode {
  person: Person;
  x: number;      // top-left of card
  y: number;
  level: number;
}

interface CoupleBox {
  personAId: string;   // typically male (husband)
  personBId: string;   // typically female (wife)
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutResult {
  nodes: LayoutNode[];
  couples: CoupleBox[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  buildProperLayout
 *
 *  Produces a top-down generation-based layout:
 *    • Ancestors go UP  (negative y)
 *    • "Me" couple at y=0
 *    • Children go DOWN (positive y)
 *
 *  Within each generation, couple pairs are kept side-by-side (husband left,
 *  wife right) and sibling groups are laid out centred under their parents.
 *  Connections use orthogonal routing so lines never cross diagonally.
 * ─────────────────────────────────────────────────────────────────────────────*/
function buildProperLayout(
  anchorId: string | undefined,
  persons: Person[],
  relationships: Relationship[]
): LayoutResult {
  if (persons.length === 0) return { nodes: [], couples: [] };

  const adj = buildAdjacency(relationships);
  const personMap = new Map(persons.map(p => [p.id, p]));

  /* 1. Assign generation levels via BFS from anchor
   *    parents → level - 1
   *    children → level + 1
   *    spouses  → same level
   */
  const levelMap = new Map<string, number>();
  const rootId = anchorId ?? persons[0].id;
  levelMap.set(rootId, 0);

  const bfsQueue: string[] = [rootId];
  const visited = new Set<string>();

  while (bfsQueue.length > 0) {
    const id = bfsQueue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const curLevel = levelMap.get(id) ?? 0;
    const a = adj.get(id);
    if (!a) continue;

    for (const parentId of a.parents) {
      if (!levelMap.has(parentId)) levelMap.set(parentId, curLevel - 1);
      bfsQueue.push(parentId);
    }
    for (const childId of a.children) {
      if (!levelMap.has(childId)) levelMap.set(childId, curLevel + 1);
      bfsQueue.push(childId);
    }
    for (const spouseId of a.spouses) {
      if (!levelMap.has(spouseId)) levelMap.set(spouseId, curLevel);
      bfsQueue.push(spouseId);
    }
  }

  // Any person not reached via BFS gets level 0
  for (const p of persons) {
    if (!levelMap.has(p.id)) levelMap.set(p.id, 0);
  }

  /* 2. Group persons by level */
  const byLevel = new Map<number, string[]>();
  for (const [id, lvl] of levelMap) {
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(id);
  }

  /* 3. Within each level, group couple pairs together.
   *
   *  Ordering rules (in priority order):
   *   a) At the anchor's own level: anchor is always LEFT (first in couple),
   *      spouse is always RIGHT — regardless of gender.
   *   b) At parent levels: the anchor's own parents appear LEFT-of-centre,
   *      spouse's parents appear RIGHT-of-centre, so the lines go straight
   *      down without crossing when the anchor changes.
   *   c) Fallback for other couples: male (husband) LEFT, female (wife) RIGHT.
   */
  type LevelItem =
    | { type: 'single'; id: string }
    | { type: 'couple'; leftId: string; rightId: string };

  // Identify anchor's spouse (if any, at same level)
  const anchorAdj = adj.get(rootId);
  const anchorSpouseId = anchorAdj?.spouses[0]; // first spouse

  // Identify anchor's own parents and spouse's parents
  const anchorParentIds = new Set(anchorAdj?.parents ?? []);
  const spouseParentIds = new Set(
    anchorSpouseId ? (adj.get(anchorSpouseId)?.parents ?? []) : []
  );

  const levelItems = new Map<number, LevelItem[]>();

  for (const [lvl, ids] of byLevel) {
    const placed = new Set<string>();
    const items: LevelItem[] = [];

    // Sort ids so that anchor-side people come before spouse-side people
    // This ensures the iteration below picks up couples in the right left-right order
    const sortedIds = [...ids].sort((a, b) => {
      const aIsAnchorSide = a === rootId || anchorParentIds.has(a);
      const bIsAnchorSide = b === rootId || anchorParentIds.has(b);
      if (aIsAnchorSide && !bIsAnchorSide) return -1;
      if (!aIsAnchorSide && bIsAnchorSide) return 1;
      return 0;
    });

    for (const id of sortedIds) {
      if (placed.has(id)) continue;
      const a = adj.get(id);
      const spouseInLevel = a?.spouses.find(
        sid => ids.includes(sid) && !placed.has(sid)
      );

      if (spouseInLevel) {
        placed.add(id);
        placed.add(spouseInLevel);

        // Determine left / right
        let leftId = id;
        let rightId = spouseInLevel;

        if (lvl === 0) {
          // Anchor level: anchor always left
          if (id !== rootId) { leftId = spouseInLevel; rightId = id; }
        } else if (lvl < 0) {
          // Parent/grandparent level:
          // anchor's parent → left side; spouse's parent → right side
          const idIsAnchorParent = anchorParentIds.has(id) || anchorParentIds.has(spouseInLevel)
            ? anchorParentIds.has(id)
            : true; // default keep
          if (!idIsAnchorParent && spouseParentIds.has(id)) {
            leftId = spouseInLevel; rightId = id;
          }
        } else {
          // Children level: male left, female right
          const pA = personMap.get(id);
          const pB = personMap.get(spouseInLevel);
          if (pB?.gender === 'male' && pA?.gender !== 'male') {
            leftId = spouseInLevel; rightId = id;
          }
        }

        items.push({ type: 'couple', leftId, rightId });
      } else {
        placed.add(id);
        items.push({ type: 'single', id });
      }
    }

    levelItems.set(lvl, items);
  }

  /* 4. Calculate X positions for each level (centred around 0) */
  const xMap = new Map<string, number>(); // personId → card left-x

  const itemWidth = (item: LevelItem) =>
    item.type === 'single' ? NODE_W : NODE_W * 2 + SPOUSE_GAP;

  for (const [, items] of levelItems) {
    let totalW = 0;
    items.forEach((item, i) => {
      totalW += itemWidth(item);
      if (i < items.length - 1) totalW += H_GAP;
    });

    let curX = -totalW / 2;
    for (const item of items) {
      if (item.type === 'single') {
        xMap.set(item.id, curX);
        curX += NODE_W + H_GAP;
      } else {
        xMap.set(item.leftId, curX);
        xMap.set(item.rightId, curX + NODE_W + SPOUSE_GAP);
        curX += NODE_W * 2 + SPOUSE_GAP + H_GAP;
      }
    }
  }

  /* 5. Sort levels and map each level index → Y coordinate
   *    The sorted index gives the visual row; anchor (level 0) appears in
   *    the correct row depending on whether there are ancestors above.
   */
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
  const levelToRowIndex = new Map(sortedLevels.map((lvl, i) => [lvl, i]));

  /* 6. Build LayoutNode array */
  const nodes: LayoutNode[] = [];
  const couples: CoupleBox[] = [];
  const processedCouples = new Set<string>();

  for (const [lvl, items] of levelItems) {
    const rowIdx = levelToRowIndex.get(lvl)!;
    const y = rowIdx * (NODE_H + V_GAP);

    for (const item of items) {
      if (item.type === 'single') {
        const p = personMap.get(item.id);
        if (p) nodes.push({ person: p, x: xMap.get(item.id)!, y, level: lvl });
      } else {
        const pL = personMap.get(item.leftId);
        const pR = personMap.get(item.rightId);
        const lx = xMap.get(item.leftId)!;
        const rx = xMap.get(item.rightId)!;

        if (pL) nodes.push({ person: pL, x: lx, y, level: lvl });
        if (pR) nodes.push({ person: pR, x: rx, y, level: lvl });

        const coupleKey = [item.leftId, item.rightId].sort().join('|');
        if (!processedCouples.has(coupleKey)) {
          processedCouples.add(coupleKey);
          const coupleX = Math.min(lx, rx) - 8;
          const coupleW = Math.abs(rx - lx) + NODE_W + 16;
          couples.push({
            personAId: item.leftId,
            personBId: item.rightId,
            x: coupleX,
            y: y - 8,
            width: coupleW,
            height: NODE_H + 16,
          });
        }
      }
    }
  }

  return { nodes, couples };
}

/* ─── Edge routing ──────────────────────────────────────────── */
/** Orthogonal elbow connector from parent (bottom-centre) to child (top-centre).
 *  Returns SVG path string.
 */
function elbowPath(
  x1: number, y1: number,
  x2: number, y2: number
): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

/* ─── PersonCard (SVG group) ─────────────────────────────────── */
interface CardProps {
  node: LayoutNode;
  isAnchor: boolean;
  isSelected: boolean;
  gColor: string;
  relMeta: ReturnType<typeof getRelationMeta>;
  onClick: () => void;
}

function PersonCardGroup({ node, isAnchor, isSelected, gColor, relMeta, onClick }: CardProps) {
  const p = node.person;
  const opacity = p.isDeceased ? 0.55 : 1;
  const initials = `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();

  // Card border: selected → blue; anchor → amber; otherwise relation color or gender color
  const cardStroke = isSelected
    ? '#3b82f6'
    : isAnchor
    ? '#f59e0b'
    : relMeta.badgeBorder || gColor;

  const cardStrokeW = isSelected || isAnchor ? 3 : 2;
  const avatarFill = relMeta.badgeBg || gColor;
  const avatarStroke = relMeta.badgeBorder || gColor;
  const textFill = relMeta.badgeText || gColor;

  const badgeLabel = relMeta.shortLabel.length > 16
    ? `${relMeta.shortLabel.slice(0, 15)}…`
    : relMeta.shortLabel;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: 'pointer', opacity }}
      role="button"
      aria-label={`${p.firstName} ${p.lastName}`}
    >
      {/* ── Card shadow (fake with slightly offset rect) ─── */}
      <rect
        x={3} y={3}
        width={NODE_W} height={NODE_H}
        rx={12} ry={12}
        fill="rgba(0,0,0,0.08)"
      />

      {/* ── Card body ─── */}
      <rect
        width={NODE_W} height={NODE_H}
        rx={12} ry={12}
        fill="white"
        stroke={cardStroke}
        strokeWidth={cardStrokeW}
        filter={isSelected ? 'drop-shadow(0 0 8px #3b82f680)' : undefined}
      />

      {/* ── Top color bar ─── */}
      <clipPath id={`clip-top-${p.id}`}>
        <rect width={NODE_W} height={14} rx={12} />
      </clipPath>
      <rect
        width={NODE_W} height={14}
        clipPath={`url(#clip-top-${p.id})`}
        fill={cardStroke}
      />
      {/* fill out the bottom of the top bar (so it's rectangular, not rounded at bottom) */}
      <rect width={NODE_W} height={7} y={7} fill={cardStroke} />

      {/* ── Avatar circle ─── */}
      <circle
        cx={NODE_W / 2} cy={40}
        r={20}
        fill={avatarFill}
        opacity={0.75}
      />
      <circle
        cx={NODE_W / 2} cy={40}
        r={20}
        fill="none"
        stroke={avatarStroke}
        strokeWidth={1.8}
      />

      {/* ── Initials ─── */}
      <text
        x={NODE_W / 2} y={45}
        textAnchor="middle"
        fill={textFill}
        fontSize={13}
        fontWeight="700"
      >
        {initials}
      </text>

      {/* ── Gender symbol (bottom-right of avatar) ─── */}
      <GenderSymbol
        gender={p.gender}
        cx={NODE_W / 2 + 14}
        cy={54}
      />

      {/* ── Full name ─── */}
      <text
        x={NODE_W / 2} y={69}
        textAnchor="middle"
        fill="#1f2937"
        fontSize={10.5}
        fontWeight="600"
      >
        {`${p.firstName} ${p.lastName}`.length > 20
          ? `${p.firstName} ${p.lastName}`.slice(0, 19) + '…'
          : `${p.firstName} ${p.lastName}`}
      </text>

      {/* ── Relation badge ─── */}
      <g transform={`translate(${NODE_W / 2 - 56}, 76)`}>
        <rect
          width={112}
          height={17}
          rx={8.5}
          fill={relMeta.badgeBg || '#f3f4f6'}
          stroke={relMeta.badgeBorder || '#9ca3af'}
          strokeWidth={0.8}
        />
        <text x={9} y={12} fontSize={10}>{relMeta.icon}</text>
        <text
          x={23} y={12}
          fill={relMeta.badgeText || '#4b5563'}
          fontSize={8}
          fontWeight="600"
        >
          {badgeLabel}
        </text>
      </g>

      {/* ── Deceased cross ─── */}
      {p.isDeceased && (
        <text x={8} y={26} fill="#9ca3af" fontSize={12}>✝</text>
      )}

      {/* ── Anchor star badge ─── */}
      {isAnchor && (
        <>
          <circle cx={NODE_W - 13} cy={13} r={10} fill="#fbbf24" stroke="#d97706" strokeWidth={1} />
          <text x={NODE_W - 13} y={17} textAnchor="middle" fill="#78350f" fontSize={9} fontWeight="bold">⭐</text>
        </>
      )}

      {/* ── Gender icon badge (top-left corner, small pill) ─── */}
      <circle
        cx={14} cy={13}
        r={8}
        fill={p.gender === 'male' ? '#3b82f6' : p.gender === 'female' ? '#ec4899' : '#6b7280'}
        opacity={0.9}
      />
      {p.gender === 'male' && (
        <text x={14} y={17} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">♂</text>
      )}
      {p.gender === 'female' && (
        <text x={14} y={17} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">♀</text>
      )}
      {p.gender === 'other' && (
        <text x={14} y={17} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">⚧</text>
      )}
    </g>
  );
}

/* ─── Main component ──────────────────────────────────────────── */
export function TreeVisualization({
  persons,
  relationships,
  anchorPersonId,
  selectedPersonId,
  onPersonClick,
}: TreeVisualizationProps) {
  const { settings } = useSettings();
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const { nodes, couples } = buildProperLayout(anchorPersonId, persons, relationships);

  // Re-center when anchor changes
  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [anchorPersonId]);

  /* ── Zoom & pan handlers ── */
  const handleWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({ ...prev, scale: Math.max(0.2, Math.min(3, prev.scale * delta)) }));
  }, []);

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTransform(prev => ({ ...prev, x: panStart.current.tx + dx, y: panStart.current.ty + dy }));
  };

  const handleMouseUp = () => setIsPanning(false);

  /* ── Touch handlers ── */
  const touchStart = useRef({ x: 0, y: 0, tx: 0, ty: 0, dist: 0 });

  const handleTouchStart = (e: TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx: transform.x,
        ty: transform.y,
        dist: 0,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStart.current.dist = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      setTransform(prev => ({ ...prev, x: touchStart.current.tx + dx, y: touchStart.current.ty + dy }));
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      if (touchStart.current.dist > 0) {
        const ratio = newDist / touchStart.current.dist;
        setTransform(prev => ({ ...prev, scale: Math.max(0.2, Math.min(3, prev.scale * ratio)) }));
        touchStart.current.dist = newDist;
      }
    }
  };

  const fitToScreen = () => setTransform({ x: 0, y: 0, scale: 1 });
  const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.2) }));

  if (persons.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🌳</div>
          <p className="text-lg font-medium">Your family tree is empty</p>
          <p className="text-sm mt-1">Tap + to add your first family member</p>
        </div>
      </div>
    );
  }

  /* ── Build orthogonal edges ── */
  const nodeMap = new Map(nodes.map(n => [n.person.id, n]));

  interface EdgeDef {
    path: string;
    type: 'parent-child' | 'spouse';
  }

  const edges: EdgeDef[] = [];
  const drawnEdges = new Set<string>();

  for (const rel of relationships) {
    const a = nodeMap.get(rel.personAId);
    const b = nodeMap.get(rel.personBId);
    if (!a || !b) continue;

    const edgeKey = [rel.personAId, rel.personBId].sort().join('|');
    if (drawnEdges.has(edgeKey)) continue;
    drawnEdges.add(edgeKey);

    if (rel.type === 'parent-child') {
      // personA is parent → bottom-centre of A to top-centre of B
      const x1 = a.x + NODE_W / 2;
      const y1 = a.y + NODE_H;          // bottom of parent card
      const x2 = b.x + NODE_W / 2;
      const y2 = b.y;                    // top of child card
      edges.push({ path: elbowPath(x1, y1, x2, y2), type: 'parent-child' });
    } else {
      // spouse ↔ use a horizontal line between the two card right/left midpoints
      // identify which is left and which is right
      const left = a.x < b.x ? a : b;
      const right = a.x < b.x ? b : a;
      const y = left.y + NODE_H / 2;
      const x1 = left.x + NODE_W;
      const x2 = right.x;
      edges.push({
        path: `M ${x1} ${y} L ${x2} ${y}`,
        type: 'spouse',
      });
    }
  }

  /* ── Determine viewport offset so the anchor is near centre ── */
  // We'll put the SVG origin (0,0) at approximately (svgW/2, 300) for standard view
  const SVG_OFFSET_X = 500;
  const SVG_OFFSET_Y = 300;

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-50 dark:bg-gray-900 tree-canvas">

      {/* ── Zoom controls ── */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 text-xl font-bold"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={zoomOut}
          className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 text-xl font-bold"
          aria-label="Zoom out"
        >−</button>
        <button
          onClick={fitToScreen}
          className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 text-sm font-bold"
          aria-label="Fit to screen"
        >⊡</button>
      </div>

      {/* ── Gender legend ── */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2 p-2 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 shadow-sm">
        <span className="text-[11px] font-semibold text-gray-500 self-center mr-1">Gender:</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 border-blue-300 text-blue-700">
          <span className="text-blue-600 font-bold text-sm">♂</span> Male
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-pink-50 border-pink-300 text-pink-700">
          <span className="text-pink-500 font-bold text-sm">♀</span> Female
        </span>
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { touchStart.current.dist = 0; }}
      >
        {/* ── SVG defs (no per-node clipPaths inline to avoid ID conflicts) ── */}
        <defs>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#00000018" />
          </filter>
        </defs>

        <g transform={`translate(${transform.x + SVG_OFFSET_X}, ${transform.y + SVG_OFFSET_Y}) scale(${transform.scale})`}>

          {/* ── Couple highlight boxes (drawn first, behind everything) ── */}
          {couples.map((c, i) => (
            <g key={`couple-box-${i}`}>
              <rect
                x={c.x} y={c.y}
                width={c.width} height={c.height}
                rx={16} ry={16}
                fill="#f59e0b"
                fillOpacity={0.06}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="5,4"
              />
              {/* 💍 ring icon centred between the two cards */}
              <circle
                cx={c.x + c.width / 2} cy={c.y + c.height / 2}
                r={11}
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth={1}
              />
              <text
                x={c.x + c.width / 2} y={c.y + c.height / 2 + 4}
                textAnchor="middle"
                fontSize={11}
              >💍</text>
            </g>
          ))}

          {/* ── Edges (drawn below cards) ── */}
          {edges.map((e, i) => (
            <path
              key={`edge-${i}`}
              d={e.path}
              fill="none"
              stroke={e.type === 'spouse' ? '#f59e0b' : '#9ca3af'}
              strokeWidth={e.type === 'spouse' ? 2 : 1.8}
              strokeDasharray={e.type === 'spouse' ? '6,3' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* ── Person cards (drawn on top) ── */}
          {nodes.map(node => {
            const p = node.person;
            const gColor =
              p.gender === 'male'
                ? settings.maleColor
                : p.gender === 'female'
                ? settings.femaleColor
                : settings.otherColor;

            const isSelected = p.id === selectedPersonId;
            const isAnchor = p.id === anchorPersonId;
            const relMeta = getRelationMeta(anchorPersonId, p.id, persons, relationships);

            return (
              <PersonCardGroup
                key={p.id}
                node={node}
                isAnchor={isAnchor}
                isSelected={isSelected}
                gColor={gColor}
                relMeta={relMeta}
                onClick={() => onPersonClick(p.id)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
