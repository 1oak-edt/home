import type { LatLngPoint, MapShape } from "../types";

const EARTH_RADIUS_M = 6371008.8;
const SQ_M_PER_ACRE = 4046.8564224;
const SQ_FT_PER_SQ_M = 10.763910417;
const FT_PER_M = 3.280839895;

const rad = (deg: number) => (deg * Math.PI) / 180;

// Spherical polygon area (sum of trapezoids on the sphere); accurate enough for parcel-sized shapes.
export function polygonAreaSqM(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += rad(b.lng - a.lng) * (2 + Math.sin(rad(a.lat)) + Math.sin(rad(b.lat)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

function distanceM(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthM(points: LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceM(points[i - 1], points[i]);
  return total;
}

export function formatArea(sqM: number): string {
  const acres = sqM / SQ_M_PER_ACRE;
  const sf = Math.round(sqM * SQ_FT_PER_SQ_M).toLocaleString();
  return `${acres < 10 ? acres.toFixed(2) : acres.toFixed(1)} ac (${sf} SF)`;
}

export function formatLength(m: number): string {
  const ft = m * FT_PER_M;
  return ft >= 5280 ? `${(ft / 5280).toFixed(2)} mi` : `${Math.round(ft).toLocaleString()} ft`;
}

export function describeShape(shape: MapShape): string {
  switch (shape.kind) {
    case "polygon":
      return `Polygon · ${formatArea(polygonAreaSqM(shape.points))}`;
    case "polyline":
      return `Line · ${formatLength(pathLengthM(shape.points))}`;
    case "circle":
      return `Circle · radius ${formatLength(shape.radius)} · ${formatArea(Math.PI * shape.radius * shape.radius)}`;
  }
}
