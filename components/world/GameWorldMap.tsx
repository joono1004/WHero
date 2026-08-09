"use client";

import { useCallback, useState } from "react";
import { WorldScene } from "../../app/world-prototype";
import type { HexDiagnostic } from "../../lib/world/model/world-map";
import type { MapTierId, MapTypeId } from "../../lib/world/config/map-config";

export function GameWorldMap({
  seed,
  mapTierId,
  mapTypeId,
  turn,
  onHexSelected,
}: {
  seed: number;
  mapTierId: MapTierId;
  mapTypeId: MapTypeId;
  turn: number;
  onHexSelected: (diagnostic: HexDiagnostic) => void;
}) {
  const [isReady, setIsReady] = useState(false);
  const generationId = seed;

  const handleReady = useCallback((readyGenerationId: number) => {
    if (readyGenerationId === generationId) setIsReady(true);
  }, [generationId]);

  const handleHexSelected = useCallback((diagnostic: HexDiagnostic) => {
    onHexSelected(diagnostic);
  }, [onHexSelected]);

  return (
    <div className="game-map-viewport" aria-busy={!isReady}>
      <WorldScene
        generationId={generationId}
        seed={seed}
        mapTierId={mapTierId}
        mapTypeId={mapTypeId}
        showGrid
        showFog
        onHexSelected={handleHexSelected}
        onReady={handleReady}
        externalTurnNumber={turn}
        showTacticalControls={false}
      />
      {!isReady && (
        <div className="game-map-loading" role="status" aria-live="polite">
          <strong>세계 지도를 생성하고 있습니다</strong>
          <span>시드 {seed}의 지형과 시야를 준비합니다.</span>
        </div>
      )}
    </div>
  );
}
