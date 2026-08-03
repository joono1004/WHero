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

/**
 * A compact, real 3D outpost assembled from reusable geometry. It stays fixed
 * to the terrain when the camera rotates and deliberately leaves the front of
 * the hex open so a visiting hero remains readable.
 */
export function createOutpostVisual({
  hexSize,
  factionColor = "#3f78a8",
  isCapital = false,
}: OutpostVisualOptions): OutpostVisual {
  const group = new THREE.Group();
  group.name = isCapital ? "capital-outpost" : "outpost";
  group.rotation.y = -0.2;

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
        new THREE.CylinderGeometry(radius, radius, direction.length(), 7),
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

  const timber = new THREE.MeshStandardMaterial({
    color: "#6d4428",
    roughness: 0.94,
  });
  const timberLight = new THREE.MeshStandardMaterial({
    color: "#9a6a3b",
    roughness: 0.9,
  });
  const canvas = new THREE.MeshStandardMaterial({
    color: "#d8bd7f",
    roughness: 0.92,
  });
  const canvasDark = new THREE.MeshStandardMaterial({
    color: "#8c5b35",
    roughness: 0.94,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: isCapital ? "#f0c65d" : "#b7a276",
    metalness: 0.35,
    roughness: 0.5,
  });
  const faction = new THREE.MeshStandardMaterial({
    color: factionColor,
    roughness: 0.75,
    side: THREE.DoubleSide,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: "#716b5d",
    roughness: 1,
    flatShading: true,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: "#5c6260",
    metalness: 0.48,
    roughness: 0.52,
  });
  const fireOuter = new THREE.MeshStandardMaterial({
    color: "#ef7b24",
    emissive: "#9b2f0a",
    emissiveIntensity: 1.5,
    roughness: 0.55,
    transparent: true,
    opacity: 0.92,
  });
  const fireInner = new THREE.MeshStandardMaterial({
    color: "#ffd76a",
    emissive: "#ff7d1c",
    emissiveIntensity: 1.9,
    roughness: 0.48,
  });

  const base = new THREE.Mesh(
    new THREE.CircleGeometry(hexSize * 0.69, 28),
    new THREE.MeshStandardMaterial({
      color: "#6f572f",
      roughness: 1,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.018;
  base.receiveShadow = true;
  add(base);

  const innerYard = new THREE.Mesh(
    new THREE.CircleGeometry(hexSize * 0.52, 24),
    new THREE.MeshStandardMaterial({
      color: "#8a6b3b",
      roughness: 1,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  innerYard.rotation.x = -Math.PI / 2;
  innerYard.scale.set(1, 0.83, 1);
  innerYard.position.set(0, 0.025, -hexSize * 0.05);
  innerYard.receiveShadow = true;
  add(innerYard);

  const entrancePath = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.29, hexSize * 0.56),
    new THREE.MeshStandardMaterial({
      color: "#987a4c",
      roughness: 1,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
    }),
  );
  entrancePath.rotation.x = -Math.PI / 2;
  entrancePath.position.set(0, 0.031, hexSize * 0.43);
  entrancePath.receiveShadow = true;
  add(entrancePath);

  const rearAngles = [-165, -135, -105, -75, -45, -15, 15];
  const palisadePoints: THREE.Vector3[] = [];
  rearAngles.forEach((degrees, index) => {
    const angle = THREE.MathUtils.degToRad(degrees);
    const radius = hexSize * 0.57;
    const post = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          hexSize * 0.042,
          hexSize * 0.05,
          hexSize * (index % 2 === 0 ? 0.64 : 0.58),
          7,
        ),
        index % 2 === 0 ? timberLight : timber,
      ),
    );
    post.position.set(
      Math.cos(angle) * radius,
      hexSize * 0.29,
      Math.sin(angle) * radius - hexSize * 0.03,
    );
    post.rotation.z = Math.sin(angle) * 0.04;
    add(post);
    palisadePoints.push(post.position.clone());
  });
  for (let index = 0; index < palisadePoints.length - 1; index += 1) {
    const start = palisadePoints[index];
    const end = palisadePoints[index + 1];
    beamBetween(
      new THREE.Vector3(start.x, hexSize * 0.24, start.z),
      new THREE.Vector3(end.x, hexSize * 0.24, end.z),
      hexSize * 0.022,
      timber,
    );
    beamBetween(
      new THREE.Vector3(start.x, hexSize * 0.43, start.z),
      new THREE.Vector3(end.x, hexSize * 0.43, end.z),
      hexSize * 0.018,
      timberLight,
    );
  }

  for (const side of [-1, 1]) {
    const gatePost = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.052, hexSize * 0.06, hexSize * 0.72, 7),
        timberLight,
      ),
    );
    gatePost.position.set(side * hexSize * 0.22, hexSize * 0.35, hexSize * 0.45);
    add(gatePost);
  }
  beamBetween(
    new THREE.Vector3(-hexSize * 0.23, hexSize * 0.64, hexSize * 0.45),
    new THREE.Vector3(hexSize * 0.23, hexSize * 0.64, hexSize * 0.45),
    hexSize * 0.028,
    timberLight,
  );

  const commandTent = shadowed(
    new THREE.Mesh(
      new THREE.ConeGeometry(hexSize * 0.29, hexSize * 0.58, 4),
      canvas,
    ),
  );
  commandTent.position.set(-hexSize * 0.14, hexSize * 0.3, -hexSize * 0.2);
  commandTent.rotation.y = Math.PI / 4;
  add(commandTent);

  const tentRidge = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.014, hexSize * 0.014, hexSize * 0.5, 6),
      timberLight,
    ),
  );
  tentRidge.rotation.z = Math.PI / 2;
  tentRidge.position.set(-hexSize * 0.14, hexSize * 0.56, -hexSize * 0.2);
  add(tentRidge);

  const tentDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.14, hexSize * 0.23),
    canvasDark,
  );
  tentDoor.position.set(-hexSize * 0.14, hexSize * 0.2, hexSize * 0.01);
  tentDoor.rotation.x = -0.03;
  add(tentDoor);

  const smallTent = shadowed(
    new THREE.Mesh(
      new THREE.ConeGeometry(hexSize * 0.19, hexSize * 0.38, 4),
      canvasDark,
    ),
  );
  smallTent.position.set(hexSize * 0.25, hexSize * 0.2, -hexSize * 0.22);
  smallTent.rotation.y = Math.PI / 4;
  add(smallTent);

  for (const x of [-0.36, -0.27]) {
    const rackPost = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.013, hexSize * 0.018, hexSize * 0.38, 6),
        timberLight,
      ),
    );
    rackPost.position.set(hexSize * x, hexSize * 0.2, hexSize * 0.18);
    add(rackPost);
  }
  beamBetween(
    new THREE.Vector3(-hexSize * 0.39, hexSize * 0.29, hexSize * 0.18),
    new THREE.Vector3(-hexSize * 0.24, hexSize * 0.29, hexSize * 0.18),
    hexSize * 0.014,
    timberLight,
  );
  for (const x of [-0.37, -0.32, -0.27]) {
    const spear = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.008, hexSize * 0.008, hexSize * 0.46, 5),
        iron,
      ),
    );
    spear.position.set(hexSize * x, hexSize * 0.26, hexSize * 0.17);
    spear.rotation.z = 0.12;
    add(spear);
    const spearHead = shadowed(
      new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.025, hexSize * 0.08, 5), iron),
    );
    spearHead.position.set(hexSize * (x - 0.025), hexSize * 0.5, hexSize * 0.17);
    spearHead.rotation.z = 0.12;
    add(spearHead);
  }

  for (const [x, z, rotation] of [
    [0.27, 0.12, 0.12],
    [0.38, 0.04, -0.08],
    [0.31, -0.04, 0.04],
  ] as const) {
    const crate = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.13, hexSize * 0.12, hexSize * 0.13),
        timberLight,
      ),
    );
    crate.position.set(hexSize * x, hexSize * 0.07, hexSize * z);
    crate.rotation.y = rotation;
    add(crate);
  }

  const barrel = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.075, hexSize * 0.075, hexSize * 0.16, 12),
      timberLight,
    ),
  );
  barrel.position.set(hexSize * 0.41, hexSize * 0.09, hexSize * 0.14);
  add(barrel);

  const fireCenter = new THREE.Vector3(hexSize * 0.09, 0, hexSize * 0.12);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const fireStone = shadowed(
      new THREE.Mesh(new THREE.DodecahedronGeometry(hexSize * 0.035, 0), stone),
    );
    fireStone.position.set(
      fireCenter.x + Math.cos(angle) * hexSize * 0.11,
      hexSize * 0.035,
      fireCenter.z + Math.sin(angle) * hexSize * 0.11,
    );
    add(fireStone);
  }
  for (const rotation of [-0.72, 0.72]) {
    const log = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.025, hexSize * 0.025, hexSize * 0.2, 7),
        timber,
      ),
    );
    log.position.set(fireCenter.x, hexSize * 0.055, fireCenter.z);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rotation;
    add(log);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(hexSize * 0.075, hexSize * 0.24, 7),
    fireOuter,
  );
  flame.position.set(fireCenter.x, hexSize * 0.17, fireCenter.z);
  add(flame);
  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(hexSize * 0.04, hexSize * 0.15, 7),
    fireInner,
  );
  flameCore.position.set(fireCenter.x, hexSize * 0.13, fireCenter.z + hexSize * 0.01);
  add(flameCore);

  const flagPole = shadowed(
    new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.015, hexSize * 0.022, hexSize * 1.15, 8),
      metal,
    ),
  );
  flagPole.position.set(-hexSize * 0.38, hexSize * 0.58, -hexSize * 0.06);
  add(flagPole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(hexSize * 0.4, hexSize * 0.25, 3, 2),
    faction,
  );
  flag.position.set(-hexSize * 0.18, hexSize * 0.88, -hexSize * 0.06);
  flag.rotation.y = -0.05;
  add(flag);

  if (isCapital) {
    const capitalBand = new THREE.Mesh(
      new THREE.PlaneGeometry(hexSize * 0.34, hexSize * 0.035),
      metal,
    );
    capitalBand.position.set(-hexSize * 0.18, hexSize * 0.88, -hexSize * 0.057);
    capitalBand.rotation.y = -0.05;
    add(capitalBand);
  }

  const finial = shadowed(
    new THREE.Mesh(
      new THREE.OctahedronGeometry(hexSize * (isCapital ? 0.06 : 0.045)),
      metal,
    ),
  );
  finial.position.set(-hexSize * 0.38, hexSize * 1.18, -hexSize * 0.06);
  add(finial);

  group.scale.setScalar(0.92);
  return { group, selectableMeshes };
}
