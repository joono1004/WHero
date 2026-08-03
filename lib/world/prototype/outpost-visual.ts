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

  const rearAngles = [-150, -120, -90, -60, -30, 0, 30];
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
  });

  const commandTent = shadowed(
    new THREE.Mesh(
      new THREE.ConeGeometry(hexSize * 0.29, hexSize * 0.58, 4),
      canvas,
    ),
  );
  commandTent.position.set(-hexSize * 0.14, hexSize * 0.3, -hexSize * 0.2);
  commandTent.rotation.y = Math.PI / 4;
  add(commandTent);

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

  const finial = shadowed(
    new THREE.Mesh(
      new THREE.OctahedronGeometry(hexSize * (isCapital ? 0.06 : 0.045)),
      metal,
    ),
  );
  finial.position.set(-hexSize * 0.38, hexSize * 1.18, -hexSize * 0.06);
  add(finial);

  group.scale.setScalar(0.94);
  return { group, selectableMeshes };
}
