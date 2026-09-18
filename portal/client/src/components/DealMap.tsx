import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import usTopo from "../data/us-states-10m.json";
import { geocode, jitter } from "../data/usGeo";
import { ACTIVE_STAGES } from "../types";
import type { Lead } from "../types";
import { formatCurrency } from "../utils/format";
import { CLOSED_HEX, STAGE_HEX } from "../utils/stageColors";

interface Props {
  leads: Lead[];
  onOpen: (lead: Lead) => void;
}

const TERRITORY_IDS = new Set(["60", "66", "69", "72", "78"]);

function colorFor(lead: Lead): string {
  if (lead.stage === "Disqualified" || lead.stage === "Lost") return CLOSED_HEX;
  return STAGE_HEX[lead.stage] ?? "#5A6350";
}

interface Point {
  lead: Lead;
  coordinates: [number, number];
}

export function DealMap({ leads, onOpen }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const points = useMemo<Point[]>(() => {
    return leads.flatMap((lead) => {
      const geo = geocode(lead.city, lead.state);
      if (!geo) return [];
      const [dx, dy] = jitter(lead.id, geo.precision === "city" ? 0.15 : 0.7);
      return [{ lead, coordinates: [geo.lon + dx, geo.lat + dy] as [number, number] }];
    });
  }, [leads]);

  const unmapped = leads.length - points.length;
  const hovered = points.find((p) => p.lead.id === hoverId);

  return (
    <div className="rounded-xl border border-oak-line bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">
          Deal map · {points.length} of {leads.length} deals plotted
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-oak-sage">
          {ACTIVE_STAGES.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_HEX[s] }} />
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CLOSED_HEX }} />
            DQ'd / Lost
          </span>
        </div>
      </div>

      <div className="relative">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 950 }}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={usTopo as unknown as string}>
            {({ geographies }) =>
              geographies
                .filter((geo) => !TERRITORY_IDS.has(String(geo.id)))
                .map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#F0EEE6"
                    stroke="#E4E2DA"
                    strokeWidth={0.75}
                    style={{ outline: "none" }}
                  />
                ))
            }
          </Geographies>

          {points.map(({ lead, coordinates }) => {
            const isHovered = hoverId === lead.id;
            return (
              <Marker
                key={lead.id}
                coordinates={coordinates}
                onMouseEnter={() => setHoverId(lead.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => onOpen(lead)}
              >
                <circle
                  r={isHovered ? 7 : 5}
                  fill={colorFor(lead)}
                  stroke="#FAFAF8"
                  strokeWidth={1.5}
                  opacity={0.92}
                  style={{ cursor: "pointer" }}
                />
              </Marker>
            );
          })}
        </ComposableMap>

        {hovered && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-oak-ink px-3 py-2 text-oak-cream shadow-pop">
            <div className="text-[12px] font-semibold">{hovered.lead.borrower_name}</div>
            <div className="text-[11px] text-oak-cream/70">
              {formatCurrency(hovered.lead.loan_amount)} ·{" "}
              {[hovered.lead.city, hovered.lead.state].filter(Boolean).join(", ") || "—"} ·{" "}
              {hovered.lead.stage}
            </div>
          </div>
        )}
      </div>

      {unmapped > 0 && (
        <div className="mt-2 text-[11px] text-oak-sagelight">
          {unmapped} deal{unmapped === 1 ? "" : "s"} missing a city/state and not shown.
        </div>
      )}
    </div>
  );
}
