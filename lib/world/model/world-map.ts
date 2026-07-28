import type { MapTierId, MapTypeId } from "../config/map-config";

export type CoastKind = "land" | "beach" | "cliff" | "shallow" | "deep";

export type HexCoordinate = {
  row: number;
  column: number;
};

export type WorldPosition = {
  x: number;
  z: number;
};

export type CoastCell = HexCoordinate &
  WorldPosition & {
    kind: CoastKind;
  };

export type WaterBody = {
  size: number;
  ocean: boolean;
};

export type WaterBodyIndex = Map<string, WaterBody>;

export type HexDiagnostic = HexCoordinate & {
  kind: CoastKind;
  terrain: string;
  height: number;
  layer: string;
};

export type SelectedHexPopup = {
  diagnostic: HexDiagnostic;
  x: number;
  y: number;
};

/**
 * 생성 엔진과 게임 규칙 사이에서 공유할 최소 월드 식별 정보.
 * 렌더링 객체(THREE.Mesh 등)는 이 계층에 포함하지 않는다.
 */
export type WorldMapIdentity = {
  seed: number;
  generatorVersion: number;
  tierId: MapTierId;
  mapTypeId: MapTypeId;
};
