"use client";

import Image from "next/image";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";
import { markDragEnd } from "@/app/_lib/fitting-room/fly-to-room";

// Drop where the pointer is; fall back to overlap for fast flicks.
function collision(args) {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
}

// Wraps the page so any product card can be dragged onto the fitting room.
// Mouse needs an 8px move before a drag starts, so clicks stay clicks; touch
// needs a short press, so scrolling the grid still works.
export default function DragLayer({ children }) {
  const { addPiece, setOpen, dragging, setDragging } = useFittingRoom();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  return (
    <DndContext
      id="fitting-room-dnd"
      sensors={sensors}
      collisionDetection={collision}
      autoScroll={false}
      onDragStart={({ active }) => {
        setDragging(active.data.current?.product ?? null);
        setOpen(true);
      }}
      onDragEnd={({ active, over }) => {
        const product = active.data.current?.product;
        setDragging(null);
        markDragEnd();
        if (product && over && String(over.id).startsWith("fitting-room")) addPiece(product);
      }}
      onDragCancel={() => {
        setDragging(null);
        markDragEnd();
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="relative size-32 rotate-3 cursor-grabbing rounded-2xl border border-accent/40 bg-surface-2/95 shadow-[var(--shadow-float)]">
            <Image src={dragging.image} alt="" fill sizes="128px" className="object-contain p-3" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
