import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  BackgroundVariant,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, CheckCircle, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Spinner } from '@/components/ui/Spinner';
import { nodeTypes } from '@/pages/admin/whatsapp/flow-nodes';
import { NodePalette } from '@/pages/admin/whatsapp/flow-editor/NodePalette';
import { NodeConfigPanel } from '@/pages/admin/whatsapp/flow-editor/NodeConfigPanel';
import { Modal } from '@/components/ui/Modal';
import {
  useGetWhatsappFlowQuery,
  useUpdateWhatsappFlowMutation,
  useValidateWhatsappFlowMutation,
  useTestWhatsappFlowMutation,
} from '@/api/adminApi';

let nodeIdCounter = 0;
function getNextNodeId() {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

/** Strip React Flow internal properties — only keep what we need to persist */
function serializeNodes(nodes: Node[]) {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: n.data,
  }));
}

function serializeEdges(edges: Edge[]) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    animated: e.animated,
  }));
}

const VALID_NODE_TYPES = new Set([
  'trigger', 'send_message', 'send_media', 'send_menu_link',
  'send_menu', 'send_payment', 'delay', 'wait_input', 'condition',
  'check_hours', 'check_customer', 'check_payment_method',
  'lookup_order', 'transfer_human',
]);

/** Ensure every node loaded from API has a valid position and type */
function sanitizeNodes(raw: any[]): Node[] {
  if (!raw?.length) return [];
  return raw
    .filter((n: any) => n && n.id)
    .map((n: any, i: number) => ({
      id: String(n.id),
      type: VALID_NODE_TYPES.has(n.type) ? n.type : 'trigger',
      position:
        n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number'
          ? { x: n.position.x, y: n.position.y }
          : { x: 250, y: i * 120 },
      data: n.data || {},
    }));
}

let edgeIdCounter = 0;
function sanitizeEdges(raw: any[]): Edge[] {
  if (!raw?.length) return [];
  return raw
    .filter((e: any) => e && e.source && e.target)
    .map((e: any) => ({
      id: e.id ? String(e.id) : `edge-${Date.now()}-${++edgeIdCounter}`,
      source: String(e.source),
      target: String(e.target),
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined,
      animated: e.animated ?? true,
    }));
}

export default function FlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const { data: flow, isLoading } = useGetWhatsappFlowQuery(id!, { skip: !id });
  const [updateFlow, { isLoading: isSaving }] = useUpdateWhatsappFlowMutation();
  const [validateFlow, { isLoading: isValidating }] = useValidateWhatsappFlowMutation();
  const [testFlow, { isLoading: isTesting }] = useTestWhatsappFlowMutation();

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [flowName, setFlowName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const notify = useNotify();

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Load flow data
  useEffect(() => {
    if (flow) {
      setNodes(sanitizeNodes(flow.nodes));
      setEdges(sanitizeEdges(flow.edges));
      setFlowName(flow.name || '');
      setIsActive(flow.is_active || false);
      setReady(true);
    }
  }, [flow, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedNode &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((ed) => ed.source !== selectedNode.id && ed.target !== selectedNode.id));
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw || !reactFlowInstance) return;

      const { type, data } = JSON.parse(raw) as { type: string; data: Record<string, unknown> };
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNextNodeId(),
        type,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
      setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes],
  );

  const handleSave = async () => {
    if (!id) return;

    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const triggerType = (triggerNode?.data?.trigger_type as string) || 'message_received';
    const triggerConfig = (triggerNode?.data?.trigger_config as Record<string, unknown>) || {};

    try {
      await updateFlow({
        id,
        data: {
          name: flowName,
          is_active: isActive,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          nodes: serializeNodes(nodes),
          edges: serializeEdges(edges),
        },
      }).unwrap();
      notify.success('Fluxo salvo com sucesso');
    } catch (err: any) {
      const message = err?.data?.message;
      if (Array.isArray(message)) {
        message.forEach((m: string) => notify.error(m));
      } else {
        notify.error(message || 'Erro ao salvar fluxo');
      }
    }
  };

  const handleValidate = async () => {
    if (!id) return;
    try {
      const result = await validateFlow(id).unwrap();
      if (result.valid) {
        notify.success('Fluxo valido!');
      } else {
        result.errors.forEach((err) => notify.error(err));
      }
    } catch {
      notify.error('Erro ao validar fluxo');
    }
  };

  const handleTest = async () => {
    if (!id || !testPhone.trim()) return;
    try {
      await handleSave();
      const result = await testFlow({ id, phone: testPhone }).unwrap();
      if (result.success) {
        notify.success('Fluxo enviado para teste!');
        setTestModalOpen(false);
        setTestPhone('');
      } else {
        const msgs = result.errors || [result.error || 'Erro ao testar'];
        msgs.forEach((m) => notify.error(m));
      }
    } catch {
      notify.error('Erro ao testar fluxo');
    }
  };

  if (isLoading || !ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/whatsapp')}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="w-64 h-8 text-sm font-medium"
            placeholder="Nome do fluxo"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Ativo</span>
            <Toggle checked={isActive} onChange={setIsActive} />
          </div>
          <Button variant="outline" size="sm" onClick={handleValidate} loading={isValidating}>
            <CheckCircle className="w-4 h-4" />
            Validar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTestModalOpen(true)}>
            <Play className="w-4 h-4" />
            Testar
          </Button>
          <Button size="sm" onClick={handleSave} loading={isSaving}>
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Test Modal */}
      <Modal open={testModalOpen} onClose={() => setTestModalOpen(false)} title="Testar Fluxo">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O fluxo será salvo e executado enviando as mensagens para o número informado.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Número do WhatsApp</label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
            />
            <p className="text-xs text-muted-foreground mt-1">Com código do país (ex: 5511999999999)</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTestModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleTest} loading={isTesting} disabled={!testPhone.trim()}>
              <Play className="w-4 h-4" />
              Enviar Teste
            </Button>
          </div>
        </div>
      </Modal>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Palette toggle */}
        <div className="relative">
          {paletteOpen && <NodePalette />}
          <button
            onClick={() => setPaletteOpen((v) => !v)}
            className="absolute top-2 -right-6 z-10 bg-white border border-gray-200 rounded-r-lg p-1 text-gray-400 hover:text-gray-700 transition-colors shadow-sm"
          >
            {paletteOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={memoizedNodeTypes}
            fitView
            deleteKeyCode={null}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-white !border !border-gray-200 !rounded-xl !shadow-sm"
            />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
