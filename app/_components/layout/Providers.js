"use client";

import DragLayer from "@/app/_components/fitting-room/DragLayer";
import FittingRoom from "@/app/_components/fitting-room/FittingRoom";
import Toaster from "@/app/_components/ui/Toaster";
import { FittingRoomProvider } from "@/app/_lib/fitting-room/FittingRoomProvider";

export default function Providers({ children }) {
  return (
    <FittingRoomProvider>
      <DragLayer>
        {children}
        <FittingRoom />
      </DragLayer>
      <Toaster />
    </FittingRoomProvider>
  );
}
