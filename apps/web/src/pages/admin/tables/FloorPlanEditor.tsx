import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Save,
  Plus,
  MapPin,
  Users,
  Circle,
  Square,
  GripVertical,
  X,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useGetTablesQuery,
  useGetFloorPlansQuery,
  useCreateFloorPlanMutation,
  useUpdateFloorPlanMutation,
} from '@/api/adminApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FloorPlanItem {
  table_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle';
  rotation: number;
}

interface FloorPlan {
  id: string;
  name: string;
  layout: FloorPlanItem[];
  created_at: string;
  updated_at: string;
}

interface Table {
  id: string;
  number: number;
  label: string | null;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  is_active: boolean;
}

interface DragState {
  tableId: string;
  offsetX: number;
  offsetY: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<Table['status'], { bg: string; border: string; text: string }> = {
  available: {
    bg: 'bg-success/20 dark:bg-success/30',
    border: 'border-success',
    text: 'text-success dark:text-green-400',
  },
  occupied: {
    bg: 'bg-danger/20 dark:bg-danger/30',
    border: 'border-danger',
    text: 'text-danger dark:text-red-400',
  },
  reserved: {
    bg: 'bg-accent/30 dark:bg-yellow-500/30',
    border: 'border-accent dark:border-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  maintenance: {
    bg: 'bg-muted',
    border: 'border-gray-400 dark:border-gray-500',
    text: 'text-muted-foreground',
  },
};

const STATUS_LABELS: Record<Table['status'], string> = {
  available: 'Disponivel',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  maintenance: 'Manutencao',
};

const BADGE_VARIANT: Record<Table['status'], 'success' | 'danger' | 'warning' | 'default'> = {
  available: 'success',
  occupied: 'danger',
  reserved: 'warning',
  maintenance: 'default',
};

const DEFAULT_ITEM_SIZE = 80;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FloorPlanEditor() {
  // --- API hooks ---
  const { data: tables = [], isLoading: tablesLoading } = useGetTablesQuery();
  const { data: floorPlans = [], isLoading: plansLoading } = useGetFloorPlansQuery();
  const [createFloorPlan, { isLoading: creating }] = useCreateFloorPlanMutation();
  const [updateFloorPlan, { isLoading: saving }] = useUpdateFloorPlanMutation();

  // --- Local state ---
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [layoutItems, setLayoutItems] = useState<FloorPlanItem[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Derived data ---
  const selectedPlan = (floorPlans as FloorPlan[]).find((p) => p.id === selectedPlanId) ?? null;
  const placedTableIds = new Set(layoutItems.map((item) => item.table_id));
  const activeTables = (tables as Table[]).filter((t) => t.is_active);
  const unplacedTables = activeTables.filter((t) => !placedTableIds.has(t.id));

  const getTable = useCallback(
    (id: string): Table | undefined => (tables as Table[]).find((t) => t.id === id),
    [tables],
  );

  // --- Sync layout when plan changes ---
  useEffect(() => {
    if (selectedPlan) {
      setLayoutItems(selectedPlan.layout ?? []);
      setHasUnsavedChanges(false);
      setSelectedTableId(null);
    }
  }, [selectedPlan]);

  // Auto-select first plan when data loads
  useEffect(() => {
    if (!selectedPlanId && (floorPlans as FloorPlan[]).length > 0) {
      setSelectedPlanId((floorPlans as FloorPlan[])[0].id);
    }
  }, [floorPlans, selectedPlanId]);

  // --- Drag handlers ---
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const item = layoutItems.find((i) => i.table_id === tableId);
      if (!item) return;

      const rect = canvas.getBoundingClientRect();
      setDragState({
        tableId,
        offsetX: e.clientX - rect.left - item.x,
        offsetY: e.clientY - rect.top - item.y,
      });
      setSelectedTableId(tableId);
    },
    [layoutItems],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(e.clientX - rect.left - dragState.offsetX, rect.width - DEFAULT_ITEM_SIZE));
      const newY = Math.max(0, Math.min(e.clientY - rect.top - dragState.offsetY, rect.height - DEFAULT_ITEM_SIZE));

      setLayoutItems((prev) =>
        prev.map((item) =>
          item.table_id === dragState.tableId
            ? { ...item, x: Math.round(newX), y: Math.round(newY) }
            : item,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [dragState],
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // --- Actions ---
  const handleAddToCanvas = useCallback(
    (tableId: string) => {
      const newItem: FloorPlanItem = {
        table_id: tableId,
        x: 40 + (layoutItems.length % 5) * 100,
        y: 40 + Math.floor(layoutItems.length / 5) * 100,
        width: DEFAULT_ITEM_SIZE,
        height: DEFAULT_ITEM_SIZE,
        shape: 'rectangle',
        rotation: 0,
      };
      setLayoutItems((prev) => [...prev, newItem]);
      setHasUnsavedChanges(true);
    },
    [layoutItems.length],
  );

  const handleRemoveFromCanvas = useCallback(
    (tableId: string) => {
      setLayoutItems((prev) => prev.filter((item) => item.table_id !== tableId));
      if (selectedTableId === tableId) setSelectedTableId(null);
      setHasUnsavedChanges(true);
    },
    [selectedTableId],
  );

  const handleToggleShape = useCallback(
    (tableId: string) => {
      setLayoutItems((prev) =>
        prev.map((item) =>
          item.table_id === tableId
            ? { ...item, shape: item.shape === 'rectangle' ? 'circle' : 'rectangle' }
            : item,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!selectedPlanId) return;
    try {
      await updateFloorPlan({ id: selectedPlanId, data: { layout: layoutItems } }).unwrap();
      setHasUnsavedChanges(false);
    } catch {
      // RTK Query handles error state
    }
  }, [selectedPlanId, layoutItems, updateFloorPlan]);

  const handleCreatePlan = useCallback(async () => {
    if (!newPlanName.trim()) return;
    try {
      const result = await createFloorPlan({ name: newPlanName.trim(), layout: [] }).unwrap();
      setNewPlanModalOpen(false);
      setNewPlanName('');
      if (result && typeof result === 'object' && 'id' in result) {
        setSelectedPlanId((result as { id: string }).id);
      }
    } catch {
      // RTK Query handles error state
    }
  }, [newPlanName, createFloorPlan]);

  const handleCanvasClick = useCallback(() => {
    if (!dragState) {
      setSelectedTableId(null);
    }
  }, [dragState]);

  // --- Loading ---
  if (tablesLoading || plansLoading) {
    return <PageSpinner />;
  }

  // --- Selected table info ---
  const selectedTable = selectedTableId ? getTable(selectedTableId) : null;
  const selectedItem = selectedTableId
    ? layoutItems.find((i) => i.table_id === selectedTableId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Mapa do Salao"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewPlanModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Novo Mapa
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!selectedPlanId || !hasUnsavedChanges}
            >
              <Save className="w-4 h-4" />
              Salvar Layout
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left: Canvas */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Floor plan selector */}
          {(floorPlans as FloorPlan[]).length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Planta:
              </label>
              <Select
                value={selectedPlanId ?? ''}
                onChange={(e) => setSelectedPlanId(e.target.value || null)}
                className="max-w-xs"
              >
                <option value="" disabled>
                  Selecione uma planta
                </option>
                {(floorPlans as FloorPlan[]).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </Select>
              {hasUnsavedChanges && (
                <Badge variant="warning">Alteracoes nao salvas</Badge>
              )}
            </div>
          )}

          {/* Canvas area */}
          {!selectedPlanId ? (
            <Card className="flex-1 flex items-center justify-center min-h-[500px]">
              <EmptyState
                icon={<LayoutGrid className="w-12 h-12" />}
                title="Nenhuma planta selecionada"
                description="Selecione uma planta existente ou crie uma nova para comecar."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setNewPlanModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Criar Planta
                  </Button>
                }
              />
            </Card>
          ) : (
            <div
              ref={canvasRef}
              className={cn(
                'relative min-h-[500px] flex-1 rounded-2xl border-2 border-dashed',
                'bg-muted border-border',
                'overflow-hidden select-none',
                dragState && 'cursor-grabbing',
              )}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
            >
              {/* Grid pattern hint */}
              <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {layoutItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-sm text-muted-foreground">
                    Arraste mesas do painel lateral para posiciona-las
                  </p>
                </div>
              )}

              {/* Rendered table shapes */}
              {layoutItems.map((item) => {
                const table = getTable(item.table_id);
                if (!table) return null;

                const colors = STATUS_COLORS[table.status];
                const isSelected = selectedTableId === item.table_id;
                const isDragging = dragState?.tableId === item.table_id;

                return (
                  <div
                    key={item.table_id}
                    className={cn(
                      'absolute flex flex-col items-center justify-center border-2 transition-shadow duration-150',
                      colors.bg,
                      colors.border,
                      item.shape === 'circle' ? 'rounded-full' : 'rounded-xl',
                      isSelected && 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900',
                      isDragging ? 'cursor-grabbing shadow-lg z-20' : 'cursor-grab z-10',
                      'hover:shadow-md',
                    )}
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, item.table_id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTableId(item.table_id);
                    }}
                  >
                    <span
                      className={cn(
                        'text-base font-bold leading-none',
                        colors.text,
                      )}
                    >
                      {table.number}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {table.capacity}p
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Selected table detail panel */}
          {selectedTable && selectedItem && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Mesa {selectedTable.number}
                </h3>
                <button
                  onClick={() => setSelectedTableId(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                {selectedTable.label && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rotulo</span>
                    <span className="text-foreground font-medium">
                      {selectedTable.label}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacidade</span>
                  <span className="text-foreground font-medium">
                    {selectedTable.capacity} pessoas
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={BADGE_VARIANT[selectedTable.status]}>
                    {STATUS_LABELS[selectedTable.status]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formato</span>
                  <span className="text-foreground font-medium capitalize">
                    {selectedItem.shape === 'rectangle' ? 'Retangulo' : 'Circulo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posicao</span>
                  <span className="text-foreground font-medium text-xs">
                    x:{selectedItem.x} y:{selectedItem.y}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleShape(selectedTable.id)}
                >
                  {selectedItem.shape === 'rectangle' ? (
                    <Circle className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedItem.shape === 'rectangle' ? 'Circulo' : 'Retangulo'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRemoveFromCanvas(selectedTable.id)}
                >
                  <X className="w-4 h-4" />
                  Remover
                </Button>
              </div>

              {selectedTable.status === 'occupied' && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    Mesa ocupada - sessao ativa
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-400/70 mt-0.5">
                    Verifique os pedidos desta mesa no painel de pedidos.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Unplaced tables */}
          <Card className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Mesas Disponiveis
              </h3>
              <Badge variant="default" className="ml-auto">
                {unplacedTables.length}
              </Badge>
            </div>

            {unplacedTables.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">
                  {activeTables.length === 0
                    ? 'Nenhuma mesa cadastrada'
                    : 'Todas as mesas foram posicionadas'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {unplacedTables.map((table) => {
                  const colors = STATUS_COLORS[table.status];
                  return (
                    <div
                      key={table.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-colors',
                        'bg-card',
                        'border-border',
                        'hover:border-input',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center border',
                            colors.bg,
                            colors.border,
                          )}
                        >
                          <span className={cn('text-sm font-bold', colors.text)}>
                            {table.number}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Mesa {table.number}
                            {table.label ? ` - ${table.label}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {table.capacity}
                            </span>
                            <Badge
                              variant={BADGE_VARIANT[table.status]}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {STATUS_LABELS[table.status]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddToCanvas(table.id)}
                        disabled={!selectedPlanId}
                        title="Adicionar ao Mapa"
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Legend */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Legenda
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(STATUS_LABELS) as [Table['status'], string][]).map(
                ([status, label]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-sm border',
                        STATUS_COLORS[status].bg,
                        STATUS_COLORS[status].border,
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* New Floor Plan Modal */}
      <Modal
        open={newPlanModalOpen}
        onClose={() => {
          setNewPlanModalOpen(false);
          setNewPlanName('');
        }}
        title="Novo Mapa"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nome da Planta
            </label>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="Ex: Salao Principal, Terraco, Area VIP..."
              className={cn(
                'w-full px-4 py-3 border border-input rounded-xl',
                'text-foreground bg-card',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-all placeholder:text-muted-foreground',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPlanName.trim()) handleCreatePlan();
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setNewPlanModalOpen(false);
                setNewPlanName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePlan}
              loading={creating}
              disabled={!newPlanName.trim()}
            >
              Criar Planta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
