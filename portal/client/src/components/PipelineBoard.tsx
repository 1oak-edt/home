import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { ACTIVE_STAGES } from "../types";
import type { Lead, Stage } from "../types";
import { LeadCard } from "./LeadCard";
import { PipelineColumn } from "./PipelineColumn";

interface Props {
  leads: Lead[];
  onOpen: (lead: Lead) => void;
  onDisqualify: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
  onStageChange: (lead: Lead, stage: Stage) => void;
}

export function PipelineBoard({ leads, onOpen, onDisqualify, onMarkLost, onStageChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const targetStage = over.id as Stage;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.stage === targetStage) return;
    onStageChange(lead, targetStage);
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            leads={leads.filter((l) => l.stage === stage)}
            onOpen={onOpen}
            onDisqualify={onDisqualify}
            onMarkLost={onMarkLost}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeLead && (
          <LeadCard
            lead={activeLead}
            onOpen={onOpen}
            onDisqualify={onDisqualify}
            onMarkLost={onMarkLost}
            dragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
