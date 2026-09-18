import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { geocode } from "../data/usGeo";
import type { Lead } from "../types";

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

function ClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
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

  return (
    <div className="overflow-hidden rounded-lg border border-oak-line">
      <div style={{ height: 280 }}>
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
          {(hasPin || auto) && <Marker position={center} icon={pinIcon} />}
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
    </div>
  );
}
