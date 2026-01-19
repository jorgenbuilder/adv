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

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">Vancouver Island Adventure Map</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
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

          <Button variant="outline" size="sm">
            Clear
          </Button>
        </div>
      </header>

      {/* Map Container */}
      <main className="flex-1 relative">
        <Map />

        {/* Waypoint Panel - Bottom left on mobile, left sidebar on desktop */}
        <div className="absolute bottom-4 left-4 w-72 max-h-[50vh] overflow-auto bg-background/95 backdrop-blur rounded-lg shadow-lg border hidden md:block">
          <WaypointList />
        </div>

        {/* Mobile Waypoint Sheet */}
        <div className="md:hidden absolute bottom-4 left-4 right-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" className="w-full shadow-lg">
                Waypoints
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <SheetHeader>
                <SheetTitle>Waypoints</SheetTitle>
              </SheetHeader>
              <WaypointList />
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
}
