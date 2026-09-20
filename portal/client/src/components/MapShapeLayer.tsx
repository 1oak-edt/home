import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import type {} from "@geoman-io/leaflet-geoman-free";
import L from "leaflet";
import { useCallback, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { MapShape } from "../types";

interface Props {
  shapes: MapShape[];
  onChange: (shapes: MapShape[]) => void;
}

type ShapeLayer = L.Layer & { shapeId?: string };

// Shapes must not bubble clicks to the map, or clicking one would drop a location pin.
const SHAPE_STYLE: L.PathOptions = {
  color: "#E4C386",
  weight: 3,
  fillColor: "#E4C386",
  fillOpacity: 0.2,
  bubblingMouseEvents: false,
};

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
const toPoint = (ll: L.LatLng) => ({ lat: round(ll.lat, 7), lng: round(ll.lng, 7) });
const newId = () => Math.random().toString(36).slice(2, 10);

function layerToShape(layer: ShapeLayer): MapShape | null {
  if (!layer.shapeId) layer.shapeId = newId();
  const id = layer.shapeId;
  if (layer instanceof L.Circle) {
    return { id, kind: "circle", center: toPoint(layer.getLatLng()), radius: round(layer.getRadius(), 2) };
  }
  if (layer instanceof L.Polygon) {
    const rings = layer.getLatLngs() as L.LatLng[][];
    return { id, kind: "polygon", points: (rings[0] ?? []).map(toPoint) };
  }
  if (layer instanceof L.Polyline) {
    return { id, kind: "polyline", points: (layer.getLatLngs() as L.LatLng[]).map(toPoint) };
  }
  return null;
}

function shapeToLayer(shape: MapShape): ShapeLayer {
  const latlngs = (points: { lat: number; lng: number }[]) => points.map((p) => L.latLng(p.lat, p.lng));
  let layer: ShapeLayer;
  if (shape.kind === "circle") {
    layer = L.circle(L.latLng(shape.center.lat, shape.center.lng), { ...SHAPE_STYLE, radius: shape.radius });
  } else if (shape.kind === "polygon") {
    layer = L.polygon(latlngs(shape.points), SHAPE_STYLE);
  } else {
    layer = L.polyline(latlngs(shape.points), { ...SHAPE_STYLE, fill: false });
  }
  layer.shapeId = shape.id;
  return layer;
}

export function MapShapeLayer({ shapes, onChange }: Props) {
  const map = useMap();
  const groupRef = useRef<L.FeatureGroup | null>(null);
  // JSON of what the layers currently serialize to; lets us tell our own edits apart from external changes.
  const lastJson = useRef("[]");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const serialize = useCallback((): MapShape[] => {
    const group = groupRef.current;
    if (!group) return [];
    return group.getLayers().flatMap((l) => layerToShape(l) ?? []);
  }, []);

  const emit = useCallback(() => {
    const next = serialize();
    const json = JSON.stringify(next);
    if (json === lastJson.current) return;
    lastJson.current = json;
    onChangeRef.current(next);
  }, [serialize]);

  const attach = useCallback(
    (layer: ShapeLayer) => {
      layer.on("pm:edit pm:dragend pm:markerdragend pm:vertexadded pm:vertexremoved pm:update", emit);
    },
    [emit]
  );

  const rebuild = useCallback(
    (list: MapShape[]) => {
      const group = groupRef.current;
      if (!group) return;
      group.clearLayers();
      list.forEach((s) => {
        const layer = shapeToLayer(s);
        attach(layer);
        group.addLayer(layer);
      });
      lastJson.current = JSON.stringify(serialize());
    },
    [attach, serialize]
  );

  useEffect(() => {
    const group = L.featureGroup().addTo(map);
    groupRef.current = group;
    let cancelled = false;

    // Geoman is loaded on demand so the drawing code stays out of the initial bundle; it expects a global L.
    (window as unknown as { L: typeof L }).L = L;
    import("@geoman-io/leaflet-geoman-free")
      .then(() => {
        if (cancelled) return;
        // Geoman attaches itself to maps at creation; ours already exists, so run the same two init steps by hand.
        if (!map.pm) {
          const PMMap = (L.PM as unknown as { Map: new (m: L.Map) => L.PM.PMMap }).Map;
          map.pm = new PMMap(map);
          map.pm.setGlobalOptions({});
        }
        map.pm.addControls({
          position: "topleft",
          drawMarker: false,
          drawCircleMarker: false,
          drawText: false,
          cutPolygon: false,
          rotateMode: false,
          drawPolyline: true,
          drawRectangle: true,
          drawPolygon: true,
          drawCircle: true,
          editMode: true,
          dragMode: true,
          removalMode: true,
        });
        map.pm.setGlobalOptions({ layerGroup: group, pathOptions: SHAPE_STYLE });
        group.eachLayer((l) => L.PM.reInitLayer(l));
      })
      .catch((err) => console.error("Map drawing tools failed to load", err));

    const onCreate = (e: { layer: ShapeLayer }) => {
      group.addLayer(e.layer);
      attach(e.layer);
      emit();
    };
    const onRemove = (e: { layer: ShapeLayer }) => {
      group.removeLayer(e.layer);
      emit();
    };
    map.on("pm:create", onCreate as L.LeafletEventHandlerFn);
    map.on("pm:remove", onRemove as L.LeafletEventHandlerFn);
    rebuild(shapesRef.current);

    return () => {
      cancelled = true;
      map.off("pm:create", onCreate as L.LeafletEventHandlerFn);
      map.off("pm:remove", onRemove as L.LeafletEventHandlerFn);
      map.pm?.disableDraw();
      map.pm?.removeControls();
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map, attach, emit, rebuild]);

  useEffect(() => {
    if (JSON.stringify(shapes) !== lastJson.current) rebuild(shapes);
  }, [shapes, rebuild]);

  return null;
}
