'use client';

import {useCallback, useRef, useState, useMemo, useEffect} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {useUndoRedo} from '@/hooks/use-undo-redo';

import {TableNode} from './table-node';
import type {TableNodeData} from './table-node';
import {JoinEdge} from './join-edge';
import type {JoinEdgeData, JoinType} from './join-edge';
import {TableSidebar} from './table-sidebar';
import {PropertiesPanel} from './properties-panel';
import type {TableInfo} from '@/lib/schema-metadata';
import {getSuggestedJoin} from '@/lib/schema-metadata';
import type {QuerySpec} from '@/lib/query-spec';
import {defaultQuerySpec} from '@/lib/query-spec';

const nodeTypes = {tableNode: TableNode};
const edgeTypes = {joinEdge: JoinEdge};

type QueryCanvasProps = {
  spec: QuerySpec;
  onChange: (spec: QuerySpec) => void;
  meta: TableInfo[];
};

export function QueryCanvas({spec, onChange, meta}: QueryCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [initialized, setInitialized] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const specRef = useRef(spec);
  specRef.current = spec;
  const nodeIdCounterRef = useRef(0);
  const nextNodeId = useCallback(() => `table-${++nodeIdCounterRef.current}`, []);

  // Undo/redo
  const {current, push, undo, redo, canUndo, canRedo} = useUndoRedo({nodes: [], edges: []});
  const skipPushRef = useRef(false);

  // Push to history on node/edge changes (debounced)
  const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushToHistory = useCallback(() => {
    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(() => {
      if (!skipPushRef.current) {
        push({nodes, edges});
      }
      skipPushRef.current = false;
    }, 300);
  }, [nodes, edges, push]);

  // Undo handler
  const handleUndo = useCallback(() => {
    const state = undo();
    if (state) {
      skipPushRef.current = true;
      setNodes(state.nodes as Node[]);
      setEdges(state.edges as Edge[]);
    }
  }, [undo, setNodes, setEdges]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const state = redo();
    if (state) {
      skipPushRef.current = true;
      setNodes(state.nodes as Node[]);
      setEdges(state.edges as Edge[]);
    }
  }, [redo, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if inside input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Delete selected node or edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
          setSelectedNodeId(null);
        } else if (selectedEdgeId) {
          e.preventDefault();
          setEdges((eds) => eds.filter((ed) => ed.id !== selectedEdgeId));
          setSelectedEdgeId(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, selectedNodeId, selectedEdgeId, setNodes, setEdges, setSelectedNodeId, setSelectedEdgeId]);

  // Track which table is on canvas and their selected columns
  const canvasTableMap = useMemo(() => {
    const map: Record<string, {nodeId: string; selectedColumns: string[]}> = {};
    for (const node of nodes) {
      const data = node.data as TableNodeData;
      if (data?.table) {
        map[data.table.name] = {
          nodeId: node.id,
          selectedColumns: data.selectedColumns ?? [],
        };
      }
    }
    return map;
  }, [nodes]);

  // Column toggle handler
  const handleToggleColumn = useCallback(
    (tableName: string, columnName: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          const data = n.data as TableNodeData;
          if (!data?.table || data.table.name !== tableName) return n;
          const selected = data.selectedColumns.includes(columnName)
            ? data.selectedColumns.filter((c) => c !== columnName)
            : [...data.selectedColumns, columnName];
          return {
            ...n,
            data: {...data, selectedColumns: selected} as TableNodeData,
          };
        }),
      );
    },
    [setNodes],
  );

  // Edge edit handler
  const handleEdgeEdit = useCallback(
    (edgeId: string) => {
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
    },
    [],
  );

  // Initialize canvas from spec (when loading a saved viz_spec)
  useEffect(() => {
    if (initialized || meta.length === 0) return;
    if (!spec.table) {
      setInitialized(true);
      return;
    }

    const initNodes: Node[] = [];
    const initEdges: Edge[] = [];
    const seen = new Set<string>();

    // Extract per-table selected columns from spec.select
    const tableColumns: Record<string, string[]> = {};
    for (const s of spec.select ?? []) {
      if (s.column === '*') continue;
      const dotIdx = s.column.indexOf('.');
      if (dotIdx > 0) {
        const tableName = s.column.slice(0, dotIdx);
        const colName = s.column.slice(dotIdx + 1);
        if (!tableColumns[tableName]) tableColumns[tableName] = [];
        tableColumns[tableName].push(colName);
      } else if (spec.table) {
        if (!tableColumns[spec.table]) tableColumns[spec.table] = [];
        tableColumns[spec.table].push(s.column);
      }
    }

    // Add main table
    const mainTable = meta.find((t) => t.name === spec.table);
    if (mainTable) {
      const id = nextNodeId();
      seen.add(spec.table);
      initNodes.push({
        id,
        type: 'tableNode',
        position: {x: 50, y: 50},
        data: {table: mainTable, selectedColumns: tableColumns[spec.table] ?? [], primary: true, onToggleColumn: handleToggleColumn} as unknown as TableNodeData,
      });
    }

    // Add join tables
    for (const join of spec.joins ?? []) {
      if (seen.has(join.table)) continue;
      const joinTable = meta.find((t) => t.name === join.table);
      if (!joinTable) continue;
      seen.add(join.table);
      const id = nextNodeId();
      initNodes.push({
        id,
        type: 'tableNode',
        position: {x: 400, y: 50 + initNodes.length * 200},
        data: {table: joinTable, selectedColumns: tableColumns[join.table] ?? [], onToggleColumn: handleToggleColumn} as unknown as TableNodeData,
      });
    }

    // Create edges from joins
    for (const join of spec.joins ?? []) {
      // Find the source and target node IDs
      let sourceNodeId: string | undefined;
      let targetNodeId: string | undefined;
      for (const node of initNodes) {
        const data = node.data as TableNodeData;
        if (join.on?.includes(`${data.table.name}.`)) {
          sourceNodeId = node.id;
        }
        if (data.table.name === join.table) {
          targetNodeId = node.id;
        }
      }
      if (!sourceNodeId || !targetNodeId) continue;

      initEdges.push({
        id: `edge-${sourceNodeId}-${targetNodeId}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: 'joinEdge',
        data: {
          joinType: (join.type ?? 'INNER') as JoinType,
          condition: join.on ?? '',
          onEdit: handleEdgeEdit,
        } as unknown as JoinEdgeData,
      });
    }

    if (initNodes.length > 0) {
      setNodes(initNodes);
      setEdges(initEdges);
    }
    setInitialized(true);
  }, [spec, meta, initialized, handleToggleColumn, setNodes, setEdges]);

  // Sync selected columns to QuerySpec select
  useEffect(() => {
    if (!initialized) return;
    const select: QuerySpec['select'] = [];
    for (const node of nodes) {
      const data = node.data as TableNodeData;
      if (!data?.table) continue;
      for (const col of data.selectedColumns) {
        select.push({column: `${data.table.name}.${col}`, alias: col});
      }
    }
    // Only update if select actually changed
    const currentSelect = specRef.current.select ?? [];
    const selectChanged =
      select.length !== currentSelect.length ||
      select.some((s, i) => s.column !== currentSelect[i]?.column || s.alias !== currentSelect[i]?.alias);
    if (selectChanged) {
      onChangeRef.current({...specRef.current, select: select.length > 0 ? select : [{column: '*'}]});
    }
  }, [nodes, initialized]);

  // Sync edges to QuerySpec joins
  useEffect(() => {
    if (!initialized) return;
    const joins: QuerySpec['joins'] = [];
    for (const edge of edges) {
      const data = edge.data as JoinEdgeData;
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) continue;
      const sourceData = sourceNode.data as TableNodeData;
      const targetData = targetNode.data as TableNodeData;
      if (!sourceData?.table || !targetData?.table) continue;

      joins.push({
        table: targetData.table.name,
        on: data?.condition ?? `${sourceData.table.name}.id = ${targetData.table.name}.id`,
        type: data?.joinType ?? 'INNER',
      });
    }
    onChangeRef.current({...specRef.current, joins});
  }, [edges, initialized, nodes]);

  // Sync primary table (root table node) into QuerySpec.table
  useEffect(() => {
    if (!initialized) return;
    const tableNodes = nodes.filter(
      (n) => (n.data as TableNodeData)?.table,
    );
    if (tableNodes.length === 0) {
      if (specRef.current.table) {
        onChangeRef.current({...specRef.current, table: ''});
      }
      return;
    }
    const current = tableNodes.find(
      (n) => (n.data as TableNodeData)?.primary,
    );
    const primary = current ?? tableNodes[0];
    const name = (primary.data as TableNodeData).table.name;
    if (specRef.current.table !== name) {
      onChangeRef.current({...specRef.current, table: name});
    }
  }, [nodes, initialized]);

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const sourceData = sourceNode.data as TableNodeData;
      const targetData = targetNode.data as TableNodeData;
      if (!sourceData?.table || !targetData?.table) return;

      const suggested = getSuggestedJoin(meta, sourceData.table.name, targetData.table.name);
      const condition = suggested
        ? `${sourceData.table.name}.${suggested.sourceColumn} = ${targetData.table.name}.${suggested.targetColumn}`
        : `${sourceData.table.name}.${connection.sourceHandle ?? 'id'} = ${targetData.table.name}.${connection.targetHandle ?? 'id'}`;

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'joinEdge',
        data: {
          joinType: 'INNER',
          condition,
          onEdit: handleEdgeEdit,
        } as unknown as JoinEdgeData,
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, meta, setEdges, handleEdgeEdit],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [],
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/table');
      if (!data || !reactFlowInstance) return;

      const table: TableInfo = JSON.parse(data);
      if (canvasTableMap[table.name]) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const id = nextNodeId();
      const newNode: Node = {
        id,
        type: 'tableNode',
        position,
        data: {
          table,
          selectedColumns: table.columns.slice(0, 3).map((c) => c.name),
          onToggleColumn: handleToggleColumn,
          primary: !specRef.current.table,
        } as unknown as TableNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, canvasTableMap, setNodes, handleToggleColumn],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const addTableDirectly = useCallback(
    (table: TableInfo) => {
      if (canvasTableMap[table.name]) return;

      const position = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({x: 300, y: 200 + nodes.length * 50})
        : {x: 300, y: 200 + nodes.length * 50};

      const id = nextNodeId();
      const newNode: Node = {
        id,
        type: 'tableNode',
        position,
        data: {
          table,
          selectedColumns: table.columns.slice(0, 3).map((c) => c.name),
          onToggleColumn: handleToggleColumn,
          primary: !specRef.current.table,
        } as unknown as TableNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [canvasTableMap, reactFlowInstance, nodes.length, setNodes, handleToggleColumn],
  );

  const clearCanvas = useCallback(() => {
    if (!confirm('¿Limpiar todo el canvas? Esta acción no se puede deshacer.')) return;
    setNodes([]);
    setEdges([]);
    nodeIdCounterRef.current = 0;
    onChange(defaultQuerySpec(''));
  }, [setNodes, setEdges, onChange]);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  // Right panel defaults to the primary table when no node/edge is selected,
  // so the full controls (columns, filters, etc.) are always available.
  const panelNode =
    selectedNode ??
    nodes.find((n) => (n.data as TableNodeData)?.primary) ??
    null;
  const panelNodeData = panelNode
    ? (panelNode.data as TableNodeData)
    : null;

  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;
  const selectedEdgeData = selectedEdge
    ? (selectedEdge.data as JoinEdgeData)
    : null;

  const edgeSourceTarget = useMemo(() => {
    if (!selectedEdge) return null;
    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = nodes.find((n) => n.id === selectedEdge.target);
    const sourceData = sourceNode?.data as TableNodeData;
    const targetData = targetNode?.data as TableNodeData;
    return {
      sourceTable: sourceData?.table?.name ?? '',
      targetTable: targetData?.table?.name ?? '',
    };
  }, [selectedEdge, nodes]);

  return (
    <div className="flex h-full overflow-hidden -m-4">
      {/* Left sidebar — table list */}
      <div className="w-56 border-r border-zinc-800 overflow-y-auto p-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Tablas
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="text-[9px] text-zinc-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Deshacer (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="text-[9px] text-zinc-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Rehacer (Ctrl+Shift+Z)"
            >
              ↷
            </button>
            {nodes.length > 0 && (
              <button
                onClick={clearCanvas}
                className="text-[9px] text-zinc-600 hover:text-red-400"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
        <TableSidebar
          tables={meta}
          canvasTables={Object.keys(canvasTableMap)}
          onAddTable={addTableDirectly}
        />
      </div>

      {/* Center — React Flow canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange as OnNodesChange}
          onEdgesChange={onEdgesChange as OnEdgesChange}
          onConnect={handleConnect}
          onInit={setReactFlowInstance}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-zinc-950"
        >
          <Background gap={15} size={1} color="#27272a" />
          <Controls className="!bg-zinc-800 !border-zinc-700 !rounded-lg" />
          <MiniMap
            className="!bg-zinc-900 !border-zinc-700"
            nodeColor="#3b82f6"
            maskColor="rgba(0,0,0,0.5)"
          />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-zinc-600">
              <p className="text-sm mb-1">Arrastra una tabla desde la izquierda</p>
              <p className="text-[10px]">o haz clic en + para agregar al canvas</p>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — properties */}
      <div className="w-64 border-l border-zinc-800 overflow-y-auto p-3">
        <PropertiesPanel
          spec={spec}
          meta={meta}
          selectedTable={panelNodeData?.table?.name ?? null}
          selectedColumns={panelNodeData?.selectedColumns ?? []}
          selectedEdge={
            selectedEdge && edgeSourceTarget
              ? {
                  id: selectedEdge.id,
                  joinType: selectedEdgeData?.joinType ?? 'INNER',
                  condition: selectedEdgeData?.condition ?? '',
                  ...edgeSourceTarget,
                }
              : null
          }
          onSpecChange={onChange}
          onEdgeUpdate={(edgeId, joinType, condition) => {
            setEdges((eds) =>
              eds.map((e) => {
                if (e.id !== edgeId) return e;
                return {
                  ...e,
                  data: {...(e.data as JoinEdgeData), joinType, condition} as unknown as JoinEdgeData,
                };
              }),
            );
          }}
          onToggleColumn={handleToggleColumn}
        />
      </div>
    </div>
  );
}
