'use client';

import { Map } from '@/components/map';
import { WaypointList } from '@/components/WaypointList';
import { ShareButton } from '@/components/ShareButton';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouteState } from '@/lib/store';
import { MapPin } from 'lucide-react';

export default function Home() {
  const { waypoints } = useRouteState();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Main content area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Map - Full screen */}
        <Map />

        {/* Desktop: Sidebar waypoint panel */}
        <div className="hidden md:block absolute top-4 left-4 w-80 max-h-[calc(100vh-6rem)] overflow-auto bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border">
          <WaypointList />
        </div>

        {/* Share button overlay - bottom left */}
        <div className="absolute bottom-4 left-4 z-10 md:bottom-6 md:left-6 safe-area-bottom safe-area-left">
          <ShareButton />
        </div>

        {/* Mobile: Floating action buttons */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 p-3 safe-area-bottom">
          {/* Waypoint count badge */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="lg"
                className="w-full shadow-lg h-14 text-base gap-3"
              >
                <div className="relative">
                  <MapPin className="w-5 h-5" />
                  {waypoints.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {waypoints.length}
                    </span>
                  )}
                </div>
                <span>
                  {waypoints.length === 0
                    ? 'Tap map to add waypoints'
                    : waypoints.length === 1
                    ? '1 Waypoint'
                    : `${waypoints.length} Waypoints`}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] max-h-[60vh]">
              <SheetHeader className="pb-2">
                <SheetTitle>Route Waypoints</SheetTitle>
              </SheetHeader>
              <div className="overflow-auto flex-1 -mx-4 px-4">
                <WaypointList />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
}
