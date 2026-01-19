'use client';

import { useState } from 'react';
import { Map } from '@/components/map';
import { ShareButton } from '@/components/ShareButton';
import { FilterPanel } from '@/components/FilterPanel';
import { WaypointList } from '@/components/WaypointList';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouteState } from '@/lib/store';
import { SlidersHorizontal, MapPin, Menu, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { waypoints, clearRoute } = useRouteState();

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        {/* Header - Compact on mobile, full on desktop */}
        <header className="h-12 md:h-14 border-b bg-background flex items-center justify-between px-2 md:px-4 shrink-0 z-10">
          {/* Left side - Title */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-sm md:text-lg truncate">
              <span className="hidden sm:inline">Vancouver Island Adventure Map</span>
              <span className="sm:hidden">VI Adventure</span>
            </h1>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Filters Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Road Filters</SheetTitle>
                  </SheetHeader>
                  <FilterPanel />
                </SheetContent>
              </Sheet>

              <ShareButton />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearRoute}
                    disabled={waypoints.length === 0}
                  >
                    Clear
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all waypoints</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-12 left-0 right-0 bg-background border-b shadow-lg z-20 p-3 flex flex-col gap-2">
            {/* Filters Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-11"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-3" />
                  Road Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Road Filters</SheetTitle>
                </SheetHeader>
                <FilterPanel />
              </SheetContent>
            </Sheet>

            <ShareButton />

            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => {
                clearRoute();
                setMobileMenuOpen(false);
              }}
              disabled={waypoints.length === 0}
            >
              Clear all waypoints
            </Button>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 relative overflow-hidden">
          {/* Map - Full screen */}
          <Map />

          {/* Desktop: Sidebar waypoint panel */}
          <div className="hidden md:block absolute top-4 left-4 w-80 max-h-[calc(100vh-6rem)] overflow-auto bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border">
            <WaypointList />
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

          {/* Click outside mobile menu to close */}
          {mobileMenuOpen && (
            <div
              className="md:hidden absolute inset-0 z-10"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
