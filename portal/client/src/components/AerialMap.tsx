import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { api } from "../api";
import { geocode } from "../data/usGeo";
import type { Lead, MapShape } from "../types";
import { describeShape } from "../utils/geo";
import { MapShapeLayer } from "./MapShapeLayer";

interface Props {
  lead: Lead;
  onSetPin: (lat: number, lon: number) => void;
  onClearPin: () => void;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 2c-6 0-10 4.5-10 10 0 7.5 10 16 10 16s10-8.5 10-16c0-5.5-4-10-10-10z" fill="#E4C386" stroke="#232C17" stroke-width="1.5"/>
    <circle cx="15" cy="12" r="4" fill="#232C17"/>
  </svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

const SAVE_DELAY_MS = 600;

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

// Clicks that draw, edit, or finish a shape must not also drop the location pin.
function ClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  const map = useMap();
  const lastDrawAt = useRef(0);

  useEffect(() => {
    const mark = () => {
      lastDrawAt.current = Date.now();
    };
    map.on("pm:drawend pm:create pm:remove", mark);
    return () => {
      map.off("pm:drawend pm:create pm:remove", mark);
    };
  }, [map]);

  useMapEvents({
    click: (e) => {
      const pm = map.pm;
      if (pm && (pm.globalDrawModeEnabled() || pm.globalEditModeEnabled() || pm.globalDragModeEnabled() || pm.globalRemovalModeEnabled())) {
        return;
      }
      if (Date.now() - lastDrawAt.current < 400) return;
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function AerialMap({ lead, onSetPin, onClearPin }: Props) {
  const auto = useMemo(() => geocode(lead.city, lead.state), [lead.city, lead.state]);
  const hasPin = lead.latitude != null && lead.longitude != null;
  const center: [number, number] = hasPin
    ? [lead.latitude as number, lead.longitude as number]
    : auto
      ? [auto.lat, auto.lon]
      : [39.8283, -98.5795];
  const zoom = hasPin ? 17 : auto?.precision === "city" ? 13 : 5;

  const [shapes, setShapes] = useState<MapShape[]>([]);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [shapesError, setShapesError] = useState<string | null>(null);
  const latest = useRef<MapShape[]>([]);
  const pending = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    api
      .getMapShapes(lead.id)
      .then((res) => {
        if (cancelled) return;
        latest.current = res.shapes;
        setShapes(res.shapes);
      })
      .catch((e) => !cancelled && setShapesError(e instanceof Error ? e.message : "Failed to load saved shapes."));
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  const flush = useCallback(async () => {
    if (!pending.current) return;
    pending.current = false;
    setStatus("saving");
    try {
      await api.saveMapShapes(lead.id, latest.current);
      setStatus(pending.current ? "unsaved" : "saved");
    } catch {
      pending.current = true;
      setStatus("error");
    }
  }, [lead.id]);

  const handleShapesChange = useCallback(
    (next: MapShape[]) => {
      latest.current = next;
      setShapes(next);
      pending.current = true;
      setStatus("unsaved");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      if (pending.current) void flush();
    };
  }, [flush]);

  const statusText: Record<SaveStatus, string> = {
    saved: "Shapes saved",
    unsaved: "Saving…",
    saving: "Saving…",
    error: "Couldn't save shapes — will retry on your next change",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-oak-line">
      <div style={{ height: 340 }}>
        <MapContainer
          key={`${center[0]}-${center[1]}`}
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
            maxZoom={19}
          />
          <ClickHandler onClick={onSetPin} />
          <MapShapeLayer shapes={shapes} onChange={handleShapesChange} />
          {(hasPin || auto) && <Marker position={center} icon={pinIcon} pmIgnore />}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between bg-white px-3 py-2 text-[12px]">
        <div className="text-oak-sagelight">
          {hasPin ? (
            <>
              Pin set at {(lead.latitude as number).toFixed(5)}, {(lead.longitude as number).toFixed(5)}
            </>
          ) : auto ? (
            <>Approximate location from {auto.precision === "city" ? "city" : "state"} — click the map to drop a precise pin</>
          ) : (
            <>No location on file — click the map to set one</>
          )}
        </div>
        {hasPin && (
          <button onClick={onClearPin} className="font-semibold text-oak-sage hover:text-oak-ink">
            Reset to auto
          </button>
        )}
      </div>
      <div className="border-t border-oak-line bg-white px-3 py-2 text-[12px]">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium text-oak-ink">
            Drawn shapes{shapes.length > 0 ? ` (${shapes.length})` : ""}
          </div>
          <div className={shapesError || status === "error" ? "font-semibold text-red-700" : "text-oak-sagelight"}>
            {shapesError ?? statusText[status]}
          </div>
        </div>
        {shapes.length === 0 ? (
          <div className="mt-1 text-oak-sagelight">
            Use the toolbar on the map to outline the property: polygon, rectangle, circle, or line. Shapes are saved
            automatically and can be edited, moved, or deleted with the tools below the draw buttons.
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {shapes.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-oak-line bg-oak-goldlight/40 py-0.5 pl-2.5 pr-1 text-oak-ink"
              >
                {describeShape(s)}
                <button
                  onClick={() => handleShapesChange(shapes.filter((x) => x.id !== s.id))}
                  className="rounded-full px-1 text-oak-sagelight hover:text-red-700"
                  aria-label="Remove shape"
                  title="Remove shape"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
