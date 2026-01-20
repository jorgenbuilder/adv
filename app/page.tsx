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

/**
 * Format distance in meters to a human readable string
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

/**
 * Format time in seconds to a human readable string
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export default function Home() {
  const { waypoints, calculatedRoute } = useRouteState();

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

        {/* Mobile: Floating waypoints button - top left */}
        <div className="md:hidden absolute top-4 left-4 safe-area-top safe-area-left z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="default"
                className="shadow-lg gap-2"
              >
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="text-left">
                  {waypoints.length === 0 ? (
                    'Add Waypoints'
                  ) : calculatedRoute && calculatedRoute.distance > 0 ? (
                    <>
                      {waypoints.length} {waypoints.length === 1 ? 'Point' : 'Points'}
                      {', '}
                      {formatDistance(calculatedRoute.distance)}
                      {calculatedRoute.travelTime && calculatedRoute.travelTime > 0 && (
                        <>, {formatTime(calculatedRoute.travelTime)}</>
                      )}
                    </>
                  ) : (
                    `${waypoints.length} ${waypoints.length === 1 ? 'Waypoint' : 'Waypoints'}`
                  )}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] max-h-[calc(60vh-env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)]">
              <SheetHeader className="pb-2 flex-shrink-0">
                <SheetTitle>Route Waypoints</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto flex-1 min-h-0 -mx-4 px-4">
                <WaypointList />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
}
