import * as THREE from "three";

export type OutpostVisual = {
  group: THREE.Group;
  selectableMeshes: THREE.Object3D[];
};

type OutpostVisualOptions = {
  hexSize: number;
  factionColor?: THREE.ColorRepresentation;
  isCapital?: boolean;
};

function shadowed<T extends THREE.Mesh>(mesh: T) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A hex-filling 3D military camp with a central command tent. */
export function createOutpostVisual({
  hexSize,
  factionColor = "#2f86df",
  isCapital = false,
}: OutpostVisualOptions): OutpostVisual {
  const group = new THREE.Group();
  group.name = isCapital ? "capital-outpost" : "outpost";
  group.rotation.y = -0.08;

  const selectableMeshes: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(object: T) => {
    group.add(object);
    selectableMeshes.push(object);
    return object;
  };
  const beamBetween = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
  ) => {
    const direction = end.clone().sub(start);
    const beam = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
        material,
      ),
    );
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return add(beam);
  };

  const timber = new THREE.MeshStandardMaterial({ color: "#684127", roughness: 0.96 });
  const timberLight = new THREE.MeshStandardMaterial({ color: "#97663a", roughness: 0.92 });
  const factionBase = new THREE.Color(factionColor);
  const canvasLight = new THREE.MeshStandardMaterial({
    color: factionBase.clone().lerp(new THREE.Color("#dcecff"), 0.24),
    roughness: 0.91,
  });
  const canvasDark = new THREE.MeshStandardMaterial({
    color: factionBase.clone().lerp(new THREE.Color("#14283e"), 0.42),
    roughness: 0.94,
  });
  const faction = new THREE.MeshStandardMaterial({
    color: factionColor,
    roughness: 0.74,
    side: THREE.DoubleSide,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: isCapital ? "#f0c65d" : "#b9aa84",
    metalness: 0.34,
    roughness: 0.54,
  });
  const stone = new THREE.MeshStandardMaterial({ color: "#716a5d", roughness: 1 });
  const fireOuter = new THREE.MeshStandardMaterial({
    color: "#ef7b24",
    emissive: "#9b2f0a",
    emissiveIntensity: 1.45,
    transparent: true,
    opacity: 0.92,
  });
  const fireInner = new THREE.MeshStandardMaterial({
    color: "#ffd76a",
    emissive: "#ff7d1c",
    emissiveIntensity: 1.8,
  });

  const base = new THREE.Mesh(
    new THREE.CircleGeometry(hexSize * 0.88, 36),
    new THREE.MeshStandardMaterial({
      color: "#735a34",
      roughness: 1,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.018;
  base.receiveShadow = true;
  add(base);

  const yard = new THREE.Mesh(
    new THREE.CircleGeometry(hexSize * 0.72, 32),
    new THREE.MeshStandardMaterial({
      color: "#957345",
      roughness: 1,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    }),
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.y = 0.026;
  yard.receiveShadow = true;
  add(yard);

  const entrancePath = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.25, hexSize * 0.48),
    new THREE.MeshStandardMaterial({
      color: "#aa8958",
      roughness: 1,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  entrancePath.rotation.x = -Math.PI / 2;
  entrancePath.position.set(0, 0.032, hexSize * 0.66);
  add(entrancePath);

  // Dense palisade around the whole hex, leaving only a narrow front gate.
  const palisadePoints: THREE.Vector3[] = [];
  for (let degrees = -180; degrees < 180; degrees += 15) {
    if (degrees >= 72 && degrees <= 108) continue;
    const angle = THREE.MathUtils.degToRad(degrees);
    const radius = hexSize * 0.82;
    const height = hexSize * (degrees % 30 === 0 ? 0.55 : 0.49);
    const post = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.034, hexSize * 0.043, height, 6),
        degrees % 30 === 0 ? timberLight : timber,
      ),
    );
    post.position.set(Math.cos(angle) * radius, height * 0.5, Math.sin(angle) * radius);
    add(post);
    const tip = shadowed(
      new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.045, hexSize * 0.12, 6), timberLight),
    );
    tip.position.set(post.position.x, height + hexSize * 0.055, post.position.z);
    add(tip);
    palisadePoints.push(post.position.clone());
  }
  for (let index = 0; index < palisadePoints.length - 1; index += 1) {
    const start = palisadePoints[index];
    const end = palisadePoints[index + 1];
    if (start.distanceTo(end) > hexSize * 0.32) continue;
    beamBetween(
      new THREE.Vector3(start.x, hexSize * 0.2, start.z),
      new THREE.Vector3(end.x, hexSize * 0.2, end.z),
      hexSize * 0.015,
      timber,
    );
    beamBetween(
      new THREE.Vector3(start.x, hexSize * 0.36, start.z),
      new THREE.Vector3(end.x, hexSize * 0.36, end.z),
      hexSize * 0.014,
      timberLight,
    );
  }

  for (const side of [-1, 1]) {
    const gatePost = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.052, hexSize * 0.062, hexSize * 0.72, 7),
        timberLight,
      ),
    );
    gatePost.position.set(side * hexSize * 0.2, hexSize * 0.35, hexSize * 0.77);
    add(gatePost);
  }
  beamBetween(
    new THREE.Vector3(-hexSize * 0.21, hexSize * 0.66, hexSize * 0.77),
    new THREE.Vector3(hexSize * 0.21, hexSize * 0.66, hexSize * 0.77),
    hexSize * 0.024,
    timberLight,
  );

  // Large command tent occupies the centre; smaller troop tents surround it.
  const commandTent = shadowed(
    new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.34, hexSize * 0.66, 4), canvasLight),
  );
  commandTent.position.set(0, hexSize * 0.34, -hexSize * 0.08);
  commandTent.rotation.y = Math.PI / 4;
  add(commandTent);
  const commandDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.16, hexSize * 0.27),
    canvasDark,
  );
  commandDoor.position.set(0, hexSize * 0.21, hexSize * 0.17);
  add(commandDoor);

  const troopTents = [
    [-0.47, -0.34, 0.25],
    [0.47, -0.34, -0.25],
    [-0.5, 0.27, 0.12],
    [0.5, 0.27, -0.12],
  ] as const;
  troopTents.forEach(([x, z, rotation], index) => {
    const tent = shadowed(
      new THREE.Mesh(
        new THREE.ConeGeometry(hexSize * 0.17, hexSize * 0.34, 4),
        index % 2 === 0 ? canvasDark : canvasLight,
      ),
    );
    tent.position.set(hexSize * x, hexSize * 0.18, hexSize * z);
    tent.rotation.y = Math.PI / 4 + rotation;
    add(tent);
  });

  const addFlag = (x: number, z: number, height: number, scale = 1) => {
    const pole = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.012, hexSize * 0.018, height, 7),
        metal,
      ),
    );
    pole.position.set(x, height * 0.5, z);
    add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(hexSize * 0.27 * scale, hexSize * 0.17 * scale),
      faction,
    );
    flag.position.set(x + hexSize * 0.13 * scale, height * 0.79, z);
    add(flag);
    const finial = shadowed(
      new THREE.Mesh(new THREE.OctahedronGeometry(hexSize * 0.035 * scale), metal),
    );
    finial.position.set(x, height + hexSize * 0.025, z);
    add(finial);
  };

  // Command flag and evenly spaced wall flags make ownership readable.
  addFlag(-hexSize * 0.19, -hexSize * 0.07, hexSize * 1.16, 1.22);
  for (const degrees of [-150, -30, 30, 150]) {
    const angle = THREE.MathUtils.degToRad(degrees);
    addFlag(
      Math.cos(angle) * hexSize * 0.78,
      Math.sin(angle) * hexSize * 0.78,
      hexSize * 0.74,
      0.68,
    );
  }

  const fireCenter = new THREE.Vector3(0, 0, hexSize * 0.38);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const fireStone = shadowed(
      new THREE.Mesh(new THREE.DodecahedronGeometry(hexSize * 0.026, 0), stone),
    );
    fireStone.position.set(
      fireCenter.x + Math.cos(angle) * hexSize * 0.08,
      hexSize * 0.026,
      fireCenter.z + Math.sin(angle) * hexSize * 0.08,
    );
    add(fireStone);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(hexSize * 0.052, hexSize * 0.17, 7),
    fireOuter,
  );
  flame.position.set(fireCenter.x, hexSize * 0.12, fireCenter.z);
  add(flame);
  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(hexSize * 0.027, hexSize * 0.1, 7),
    fireInner,
  );
  flameCore.position.set(fireCenter.x, hexSize * 0.09, fireCenter.z + hexSize * 0.008);
  add(flameCore);

  for (const [x, z] of [[-0.25, 0.4], [0.26, 0.41]] as const) {
    const crate = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.11, hexSize * 0.1, hexSize * 0.11),
        timberLight,
      ),
    );
    crate.position.set(hexSize * x, hexSize * 0.055, hexSize * z);
    add(crate);
  }

  group.scale.setScalar(1);
  return { group, selectableMeshes };
}

/** Level 2 settlement: a compact timber town enclosed by palisades. */
export function createSmallCityVisual({
  hexSize,
  factionColor = "#2f86df",
  isCapital = false,
}: OutpostVisualOptions): OutpostVisual {
  const group = new THREE.Group();
  group.name = isCapital ? "capital-small-city" : "small-city";
  group.rotation.y = -0.08;

  const selectableMeshes: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(object: T) => {
    group.add(object);
    selectableMeshes.push(object);
    return object;
  };
  const timber = new THREE.MeshStandardMaterial({ color: "#654126", roughness: 0.96 });
  const timberLight = new THREE.MeshStandardMaterial({ color: "#a37341", roughness: 0.9 });
  const plaster = new THREE.MeshStandardMaterial({ color: "#d5c39a", roughness: 1 });
  const roof = new THREE.MeshStandardMaterial({ color: "#765038", roughness: 0.94 });
  const faction = new THREE.MeshStandardMaterial({
    color: factionColor,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: isCapital ? "#f0c65d" : "#bcae86",
    metalness: 0.3,
    roughness: 0.58,
  });

  const base = new THREE.Mesh(
    new THREE.CircleGeometry(hexSize * 0.9, 6),
    new THREE.MeshStandardMaterial({ color: "#80653d", roughness: 1 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.018;
  base.receiveShadow = true;
  add(base);

  const wallRadius = hexSize * 0.82;
  const corners = Array.from({ length: 6 }, (_, index) => {
    const angle = THREE.MathUtils.degToRad(30 + index * 60);
    return new THREE.Vector3(
      Math.cos(angle) * wallRadius,
      0,
      Math.sin(angle) * wallRadius,
    );
  });
  const towerCorners = new Set([0, 2, 4]);
  corners.forEach((start, side) => {
    const end = corners[(side + 1) % corners.length];
    for (let step = 0; step < 6; step += 1) {
      if (side === 1 && (step === 2 || step === 3)) continue;
      const position = start.clone().lerp(end, step / 6);
      const height = hexSize * 0.46;
      const post = shadowed(
        new THREE.Mesh(
          new THREE.CylinderGeometry(hexSize * 0.026, hexSize * 0.035, height, 6),
          step % 2 === 0 ? timberLight : timber,
        ),
      );
      post.position.set(position.x, height * 0.5, position.z);
      add(post);
      const tip = shadowed(
        new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.037, hexSize * 0.1, 6), timberLight),
      );
      tip.position.set(position.x, height + hexSize * 0.045, position.z);
      add(tip);
    }
  });

  towerCorners.forEach((cornerIndex) => {
    const point = corners[cornerIndex];
    const towerBase = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.13, hexSize * 0.15, hexSize * 0.58, 6),
        timberLight,
      ),
    );
    towerBase.position.set(point.x, hexSize * 0.29, point.z);
    add(towerBase);
    const platform = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.18, hexSize * 0.18, hexSize * 0.08, 6),
        timber,
      ),
    );
    platform.position.set(point.x, hexSize * 0.61, point.z);
    add(platform);
    const towerRoof = shadowed(
      new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.2, hexSize * 0.22, 6), roof),
    );
    towerRoof.position.set(point.x, hexSize * 0.76, point.z);
    add(towerRoof);
  });

  const addHouse = (
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    command = false,
  ) => {
    const body = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * width, hexSize * height, hexSize * depth),
        command ? timberLight : plaster,
      ),
    );
    body.position.set(hexSize * x, hexSize * height * 0.5 + 0.04, hexSize * z);
    add(body);
    const houseRoof = shadowed(
      new THREE.Mesh(
        new THREE.ConeGeometry(hexSize * Math.max(width, depth) * 0.72, hexSize * 0.24, 4),
        command ? faction : roof,
      ),
    );
    houseRoof.position.set(hexSize * x, hexSize * (height + 0.16), hexSize * z);
    houseRoof.rotation.y = Math.PI / 4;
    add(houseRoof);
    return body;
  };

  addHouse(0, -0.09, 0.42, 0.34, 0.42, true);
  addHouse(-0.43, -0.28, 0.25, 0.2, 0.28);
  addHouse(0.43, -0.28, 0.25, 0.2, 0.28);
  addHouse(-0.4, 0.28, 0.22, 0.2, 0.25);
  addHouse(0.4, 0.28, 0.22, 0.2, 0.25);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.22, hexSize * 0.7),
    new THREE.MeshStandardMaterial({ color: "#b4935f", roughness: 1 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.04, hexSize * 0.48);
  add(path);

  const addFlag = (x: number, z: number, height: number, scale = 1) => {
    const pole = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.012, hexSize * 0.017, height, 7),
        metal,
      ),
    );
    pole.position.set(x, height * 0.5, z);
    add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(hexSize * 0.25 * scale, hexSize * 0.15 * scale),
      faction,
    );
    // Align the flag's top edge with the very top of its pole.
    flag.position.set(
      x + hexSize * 0.12 * scale,
      height - hexSize * 0.075 * scale,
      z,
    );
    add(flag);
  };
  addFlag(-hexSize * 0.18, -hexSize * 0.08, hexSize * 1.1, 1.15);
  corners.forEach((point, index) => {
    if (index % 2 === 0) addFlag(point.x, point.z, hexSize * 1.18, 0.66);
  });

  group.scale.setScalar(1);
  return { group, selectableMeshes };
}

/** Level 3 settlement: an elevated stone-walled town with a tiled command hall. */
export function createMediumCityVisual({
  hexSize,
  factionColor = "#2f86df",
  isCapital = false,
}: OutpostVisualOptions): OutpostVisual {
  const group = new THREE.Group();
  group.name = isCapital ? "capital-medium-city" : "medium-city";
  group.rotation.y = -0.08;

  const selectableMeshes: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(object: T) => {
    group.add(object);
    selectableMeshes.push(object);
    return object;
  };
  const addInterior = <T extends THREE.Object3D>(object: T) => {
    object.userData.cityInterior = true;
    return add(object);
  };
  const stone = new THREE.MeshStandardMaterial({ color: "#77756c", roughness: 0.96 });
  const stoneLight = new THREE.MeshStandardMaterial({ color: "#a5a196", roughness: 0.94 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: "#555851", roughness: 0.98 });
  const timber = new THREE.MeshStandardMaterial({ color: "#684027", roughness: 0.94 });
  const timberLight = new THREE.MeshStandardMaterial({ color: "#a36c3c", roughness: 0.91 });
  const plaster = new THREE.MeshStandardMaterial({ color: "#d4c39b", roughness: 1 });
  const roofTile = new THREE.MeshStandardMaterial({ color: "#283d45", roughness: 0.88 });
  const roofEdge = new THREE.MeshStandardMaterial({ color: "#8d3f2d", roughness: 0.82 });
  const faction = new THREE.MeshStandardMaterial({
    color: factionColor,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: isCapital ? "#f0c65d" : "#c1b48d",
    metalness: 0.32,
    roughness: 0.55,
  });
  const elevatedY = hexSize * 0.16;

  const lowerFoundation = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.91, hexSize * 0.96, elevatedY, 6),
      stoneDark,
    ),
  );
  lowerFoundation.position.y = elevatedY * 0.5;
  lowerFoundation.receiveShadow = true;
  add(lowerFoundation);
  const pavedCourt = new THREE.Mesh(
    new THREE.CircleGeometry(hexSize * 0.87, 6),
    stoneLight,
  );
  pavedCourt.rotation.x = -Math.PI / 2;
  pavedCourt.position.y = elevatedY + 0.012;
  pavedCourt.receiveShadow = true;
  add(pavedCourt);

  // Stone walls follow the six sides of the occupied hex, with a front gate.
  const wallRadius = hexSize * 0.82;
  const corners = Array.from({ length: 6 }, (_, index) => {
    const angle = THREE.MathUtils.degToRad(30 + index * 60);
    return new THREE.Vector3(
      Math.cos(angle) * wallRadius,
      elevatedY,
      Math.sin(angle) * wallRadius,
    );
  });
  corners.forEach((start, side) => {
    const end = corners[(side + 1) % corners.length];
    const midpoint = start.clone().lerp(end, 0.5);
    const length = start.distanceTo(end);
    if (side === 1) {
      for (const offset of [-0.34, 0.34]) {
        const segment = shadowed(
          new THREE.Mesh(
            new THREE.BoxGeometry(length * 0.33, hexSize * 0.36, hexSize * 0.13),
            stone,
          ),
        );
        segment.position.copy(midpoint.clone().lerp(offset < 0 ? start : end, 0.48));
        segment.position.y = elevatedY + hexSize * 0.18;
        segment.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);
        add(segment);
      }
    } else {
      const wall = shadowed(
        new THREE.Mesh(
          new THREE.BoxGeometry(length, hexSize * 0.36, hexSize * 0.13),
          stone,
        ),
      );
      wall.position.copy(midpoint);
      wall.position.y = elevatedY + hexSize * 0.18;
      wall.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);
      add(wall);
    }
  });

  // Six stone towers provide a regular rhythm around the wall.
  corners.forEach((point, index) => {
    const tower = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.15, hexSize * 0.17, hexSize * 0.62, 8),
        index % 2 === 0 ? stoneLight : stone,
      ),
    );
    tower.position.set(point.x, elevatedY + hexSize * 0.31, point.z);
    add(tower);
    const battlement = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.19, hexSize * 0.19, hexSize * 0.1, 8),
        stoneDark,
      ),
    );
    battlement.position.set(point.x, elevatedY + hexSize * 0.65, point.z);
    add(battlement);
    for (let merlon = 0; merlon < 4; merlon += 1) {
      const angle = (merlon / 4) * Math.PI * 2;
      const block = shadowed(
        new THREE.Mesh(
          new THREE.BoxGeometry(hexSize * 0.075, hexSize * 0.12, hexSize * 0.075),
          stoneLight,
        ),
      );
      block.position.set(
        point.x + Math.cos(angle) * hexSize * 0.13,
        elevatedY + hexSize * 0.75,
        point.z + Math.sin(angle) * hexSize * 0.13,
      );
      add(block);
    }
  });

  const gateLeft = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.17, hexSize * 0.5, hexSize * 0.2),
      stoneDark,
    ),
  );
  gateLeft.position.set(-hexSize * 0.18, elevatedY + hexSize * 0.25, hexSize * 0.72);
  add(gateLeft);
  const gateRight = gateLeft.clone();
  gateRight.position.x = hexSize * 0.18;
  add(gateRight);
  const gateBeam = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.48, hexSize * 0.14, hexSize * 0.2),
      stoneLight,
    ),
  );
  gateBeam.position.set(0, elevatedY + hexSize * 0.52, hexSize * 0.72);
  add(gateBeam);

  const addWoodHouse = (x: number, z: number, rotation = 0) => {
    const body = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.23, hexSize * 0.25, hexSize * 0.18),
        plaster,
      ),
    );
    body.position.set(hexSize * x, elevatedY + hexSize * 0.135, hexSize * z);
    body.rotation.y = rotation;
    addInterior(body);
    const beams = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.25, hexSize * 0.055, hexSize * 0.2),
        timberLight,
      ),
    );
    beams.position.set(hexSize * x, elevatedY + hexSize * 0.26, hexSize * z);
    beams.rotation.y = rotation;
    addInterior(beams);
    const houseRoof = shadowed(
      new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.18, hexSize * 0.19, 4), timber),
    );
    houseRoof.position.set(hexSize * x, elevatedY + hexSize * 0.38, hexSize * z);
    houseRoof.rotation.y = Math.PI / 4 + rotation;
    addInterior(houseRoof);
  };
  addWoodHouse(-0.47, -0.22, 0.15);
  addWoodHouse(0.47, -0.22, -0.15);
  addWoodHouse(-0.45, 0.28, -0.12);
  addWoodHouse(0.45, 0.28, 0.12);

  // Central command hall with layered dark tile roofs and red eaves.
  const hallBase = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.52, hexSize * 0.42, hexSize * 0.38),
      timberLight,
    ),
  );
  hallBase.position.set(0, elevatedY + hexSize * 0.22, -hexSize * 0.04);
  addInterior(hallBase);
  const hallUpper = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.38, hexSize * 0.2, hexSize * 0.3),
      plaster,
    ),
  );
  hallUpper.position.set(0, elevatedY + hexSize * 0.51, -hexSize * 0.04);
  addInterior(hallUpper);
  const lowerRoof = shadowed(
    new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.42, hexSize * 0.25, 4), roofTile),
  );
  lowerRoof.position.set(0, elevatedY + hexSize * 0.54, -hexSize * 0.04);
  lowerRoof.rotation.y = Math.PI / 4;
  addInterior(lowerRoof);
  const lowerEave = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.66, hexSize * 0.045, hexSize * 0.5),
      roofEdge,
    ),
  );
  lowerEave.position.set(0, elevatedY + hexSize * 0.44, -hexSize * 0.04);
  addInterior(lowerEave);
  const upperRoof = shadowed(
    new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.28, hexSize * 0.21, 4), roofTile),
  );
  upperRoof.position.set(0, elevatedY + hexSize * 0.75, -hexSize * 0.04);
  upperRoof.rotation.y = Math.PI / 4;
  addInterior(upperRoof);
  const ridge = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.025, hexSize * 0.025, hexSize * 0.42, 8),
      metal,
    ),
  );
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(0, elevatedY + hexSize * 0.86, -hexSize * 0.04);
  addInterior(ridge);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.2, hexSize * 0.72),
    new THREE.MeshStandardMaterial({ color: "#b9b1a0", roughness: 1 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, elevatedY + 0.024, hexSize * 0.48);
  add(road);

  const addFlag = (
    x: number,
    z: number,
    height: number,
    scale = 1,
    interior = false,
  ) => {
    const pole = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.012, hexSize * 0.017, height, 7),
        metal,
      ),
    );
    pole.position.set(x, elevatedY + height * 0.5, z);
    (interior ? addInterior : add)(pole);
    const flagHeight = hexSize * 0.15 * scale;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(hexSize * 0.25 * scale, flagHeight),
      faction,
    );
    flag.position.set(
      x + hexSize * 0.12 * scale,
      elevatedY + height - flagHeight * 0.5,
      z,
    );
    (interior ? addInterior : add)(flag);
  };
  addFlag(-hexSize * 0.19, -hexSize * 0.04, hexSize * 1.16, 1.12, true);
  corners.forEach((point, index) => {
    if (index % 2 === 0) addFlag(point.x, point.z, hexSize * 1.16, 0.64);
  });

  group.scale.setScalar(1);
  return { group, selectableMeshes };
}

/** Level 4 settlement: keeps the stone outer city and replaces its core with tower keeps. */
export function createLargeCityVisual(
  options: OutpostVisualOptions,
): OutpostVisual {
  const visual = createMediumCityVisual(options);
  const { group, selectableMeshes } = visual;
  group.name = options.isCapital ? "capital-large-city" : "large-city";

  // Lv.4 retains the entire Lv.3 outer fortification and replaces only its interior.
  const oldInterior = group.children.filter(
    (object) => object.userData.cityInterior === true,
  );
  oldInterior.forEach((object) => {
    group.remove(object);
    if (object instanceof THREE.Mesh) object.geometry.dispose();
    const index = selectableMeshes.indexOf(object);
    if (index >= 0) selectableMeshes.splice(index, 1);
  });

  const { hexSize, factionColor = "#2f86df", isCapital = false } = options;
  const elevatedY = hexSize * 0.16;
  const stone = new THREE.MeshStandardMaterial({ color: "#6f716c", roughness: 0.94 });
  const stoneLight = new THREE.MeshStandardMaterial({ color: "#aaa79d", roughness: 0.92 });
  const plaster = new THREE.MeshStandardMaterial({ color: "#ded0a9", roughness: 0.98 });
  const darkTimber = new THREE.MeshStandardMaterial({ color: "#603923", roughness: 0.9 });
  const roofTile = new THREE.MeshStandardMaterial({ color: "#223a45", roughness: 0.84 });
  const redEave = new THREE.MeshStandardMaterial({ color: "#963c2d", roughness: 0.8 });
  const faction = new THREE.MeshStandardMaterial({
    color: factionColor,
    roughness: 0.68,
    side: THREE.DoubleSide,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: isCapital ? "#f2c95f" : "#c7b98e",
    metalness: 0.34,
    roughness: 0.5,
  });
  const add = <T extends THREE.Object3D>(object: T) => {
    group.add(object);
    selectableMeshes.push(object);
    return object;
  };

  const addTierRoof = (
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
  ) => {
    const eave = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * radius * 1.62, hexSize * 0.045, hexSize * radius * 1.62),
        redEave,
      ),
    );
    eave.position.set(hexSize * x, elevatedY + hexSize * (y - height * 0.32), hexSize * z);
    add(eave);
    const tiledRoof = shadowed(
      new THREE.Mesh(
        new THREE.ConeGeometry(hexSize * radius, hexSize * height, 4),
        roofTile,
      ),
    );
    tiledRoof.position.set(hexSize * x, elevatedY + hexSize * y, hexSize * z);
    tiledRoof.rotation.y = Math.PI / 4;
    add(tiledRoof);
  };

  // Four medium-height inner keeps surround the command keep.
  const innerKeeps = [
    [-0.43, -0.28],
    [0.43, -0.28],
    [-0.43, 0.3],
    [0.43, 0.3],
  ] as const;
  innerKeeps.forEach(([x, z], index) => {
    const plinth = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.18, hexSize * 0.2, hexSize * 0.12, 6),
        stone,
      ),
    );
    plinth.position.set(hexSize * x, elevatedY + hexSize * 0.06, hexSize * z);
    add(plinth);
    const towerBody = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.25, hexSize * 0.48, hexSize * 0.22),
        index % 2 === 0 ? stoneLight : plaster,
      ),
    );
    towerBody.position.set(hexSize * x, elevatedY + hexSize * 0.34, hexSize * z);
    add(towerBody);
    const timberBand = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.28, hexSize * 0.06, hexSize * 0.25),
        darkTimber,
      ),
    );
    timberBand.position.set(hexSize * x, elevatedY + hexSize * 0.55, hexSize * z);
    add(timberBand);
    addTierRoof(x, 0.7, z, 0.22, 0.22);
  });

  // The central three-tier keep is the tallest object in the city.
  const commandPlinth = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.3, hexSize * 0.34, hexSize * 0.16, 8),
      stone,
    ),
  );
  commandPlinth.position.set(0, elevatedY + hexSize * 0.08, -hexSize * 0.03);
  add(commandPlinth);

  const lowerBody = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.4, hexSize * 0.42, hexSize * 0.34),
      stoneLight,
    ),
  );
  lowerBody.position.set(0, elevatedY + hexSize * 0.34, -hexSize * 0.03);
  add(lowerBody);
  addTierRoof(0, 0.59, -0.03, 0.34, 0.25);

  const middleBody = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.31, hexSize * 0.3, hexSize * 0.27),
      plaster,
    ),
  );
  middleBody.position.set(0, elevatedY + hexSize * 0.76, -hexSize * 0.03);
  add(middleBody);
  addTierRoof(0, 0.94, -0.03, 0.28, 0.22);

  const upperBody = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(hexSize * 0.22, hexSize * 0.25, hexSize * 0.2),
      darkTimber,
    ),
  );
  upperBody.position.set(0, elevatedY + hexSize * 1.08, -hexSize * 0.03);
  add(upperBody);
  addTierRoof(0, 1.23, -0.03, 0.22, 0.2);

  const ridge = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.022, hexSize * 0.022, hexSize * 0.32, 8),
      metal,
    ),
  );
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(0, elevatedY + hexSize * 1.34, -hexSize * 0.03);
  add(ridge);

  const flagHeight = hexSize * 0.17;
  const poleHeight = hexSize * 1.58;
  const pole = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.013, hexSize * 0.018, poleHeight, 8),
      metal,
    ),
  );
  pole.position.set(-hexSize * 0.12, elevatedY + poleHeight * 0.5, -hexSize * 0.03);
  add(pole);
  const commandFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.3, flagHeight),
    faction,
  );
  commandFlag.position.set(
    hexSize * 0.03,
    elevatedY + poleHeight - flagHeight * 0.5,
    -hexSize * 0.03,
  );
  add(commandFlag);

  return visual;
}
