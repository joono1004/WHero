import * as THREE from "three";

export type ResourceSiteKind = "farm" | "logging" | "mine" | "market";

export type ResourceSiteVisual = {
  group: THREE.Group;
  selectableMeshes: THREE.Object3D[];
};

type ResourceSiteVisualOptions = {
  hexSize: number;
  kind: ResourceSiteKind;
};

const shadowed = <T extends THREE.Mesh>(mesh: T) => {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

export const RESOURCE_SITE_LABELS: Record<ResourceSiteKind, string> = {
  farm: "농장",
  logging: "벌목장",
  mine: "광산",
  market: "시장",
};

export function createResourceSiteVisual({
  hexSize,
  kind,
}: ResourceSiteVisualOptions): ResourceSiteVisual {
  const group = new THREE.Group();
  group.name = `resource-site-${kind}`;
  const selectableMeshes: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(object: T) => {
    group.add(object);
    selectableMeshes.push(object);
    return object;
  };

  const wood = new THREE.MeshStandardMaterial({ color: "#79502f", roughness: 0.96 });
  const darkWood = new THREE.MeshStandardMaterial({ color: "#4b3020", roughness: 0.98 });
  const cutWood = new THREE.MeshStandardMaterial({ color: "#d7aa67", roughness: 0.9 });
  const plaster = new THREE.MeshStandardMaterial({ color: "#e4d2a6", roughness: 0.98 });
  const roof = new THREE.MeshStandardMaterial({ color: "#8d4934", roughness: 0.92 });
  const stone = new THREE.MeshStandardMaterial({ color: "#77776f", roughness: 1, flatShading: true });
  const darkStone = new THREE.MeshStandardMaterial({ color: "#303331", roughness: 1 });
  const earth = new THREE.MeshStandardMaterial({ color: "#8b633a", roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: "#d5a640", roughness: 0.8 });

  const addBuilding = (
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    roofColor = roof,
  ) => {
    const body = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * width, hexSize * height, hexSize * depth),
        plaster,
      ),
    );
    body.position.set(hexSize * x, hexSize * height * 0.5, hexSize * z);
    add(body);
    const roofMesh = shadowed(
      new THREE.Mesh(
        new THREE.ConeGeometry(hexSize * width * 0.76, hexSize * height * 0.55, 4),
        roofColor,
      ),
    );
    roofMesh.position.set(hexSize * x, hexSize * height * 1.12, hexSize * z);
    roofMesh.rotation.y = Math.PI / 4;
    add(roofMesh);
  };

  const addFence = (x: number, z: number, length: number, rotation: number) => {
    const rail = shadowed(
      new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * length, hexSize * 0.035, hexSize * 0.035),
        wood,
      ),
    );
    rail.position.set(hexSize * x, hexSize * 0.12, hexSize * z);
    rail.rotation.y = rotation;
    add(rail);
    [-0.5, 0.5].forEach((side) => {
      const post = shadowed(
        new THREE.Mesh(
          new THREE.CylinderGeometry(hexSize * 0.025, hexSize * 0.035, hexSize * 0.25, 7),
          darkWood,
        ),
      );
      const dx = Math.cos(rotation) * hexSize * length * side;
      const dz = -Math.sin(rotation) * hexSize * length * side;
      post.position.set(hexSize * x + dx, hexSize * 0.125, hexSize * z + dz);
      add(post);
    });
  };

  if (kind === "farm") {
    const fieldColors = ["#b98536", "#cda348", "#96713b"];
    [-0.28, 0, 0.28].forEach((x, index) => {
      const field = new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.2, hexSize * 0.025, hexSize * 0.75),
        new THREE.MeshStandardMaterial({ color: fieldColors[index], roughness: 1 }),
      );
      field.position.set(hexSize * x, hexSize * 0.02, hexSize * 0.08);
      field.rotation.y = -0.12;
      field.receiveShadow = true;
      add(field);
      for (let row = 0; row < 4; row += 1) {
        const crop = shadowed(
          new THREE.Mesh(
            new THREE.CylinderGeometry(hexSize * 0.018, hexSize * 0.025, hexSize * 0.16, 6),
            gold,
          ),
        );
        crop.position.set(
          hexSize * (x + 0.02),
          hexSize * 0.1,
          hexSize * (-0.18 + row * 0.17),
        );
        add(crop);
      }
    });
    addBuilding(0.38, -0.31, 0.34, 0.28, 0.28);
    const silo = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.11, hexSize * 0.13, hexSize * 0.3, 10),
        wood,
      ),
    );
    silo.position.set(hexSize * 0.62, hexSize * 0.15, hexSize * -0.16);
    add(silo);
    const siloRoof = shadowed(
      new THREE.Mesh(new THREE.ConeGeometry(hexSize * 0.14, hexSize * 0.14, 10), roof),
    );
    siloRoof.position.set(hexSize * 0.62, hexSize * 0.37, hexSize * -0.16);
    add(siloRoof);
    addFence(-0.47, 0.48, 0.55, 0.08);
  }

  if (kind === "logging") {
    const addLog = (x: number, y: number, z: number) => {
      const log = shadowed(
        new THREE.Mesh(
          new THREE.CylinderGeometry(hexSize * 0.07, hexSize * 0.07, hexSize * 0.56, 10),
          [wood, cutWood, cutWood],
        ),
      );
      log.rotation.z = Math.PI / 2;
      log.position.set(hexSize * x, hexSize * y, hexSize * z);
      add(log);
    };
    [-0.12, 0.02, 0.16].forEach((z, index) => {
      addLog(-0.22 + (index % 2) * 0.06, 0.08 + Math.floor(index / 2) * 0.12, z);
      addLog(0.28, 0.08 + (index % 2) * 0.12, z - 0.03);
    });
    addBuilding(-0.34, -0.35, 0.36, 0.28, 0.25, darkWood);
    const stump = shadowed(
      new THREE.Mesh(
        new THREE.CylinderGeometry(hexSize * 0.13, hexSize * 0.15, hexSize * 0.16, 10),
        [wood, cutWood, cutWood],
      ),
    );
    stump.position.set(hexSize * 0.36, hexSize * 0.08, hexSize * -0.35);
    add(stump);
    [-0.55, 0.52].forEach((x, index) => {
      const trunk = shadowed(
        new THREE.Mesh(
          new THREE.CylinderGeometry(hexSize * 0.04, hexSize * 0.055, hexSize * 0.42, 8),
          darkWood,
        ),
      );
      trunk.position.set(hexSize * x, hexSize * 0.21, hexSize * (0.14 - index * 0.2));
      add(trunk);
      const crown = shadowed(
        new THREE.Mesh(
          new THREE.ConeGeometry(hexSize * 0.18, hexSize * 0.45, 9),
          new THREE.MeshStandardMaterial({ color: index ? "#477848" : "#376a43", roughness: 1, flatShading: true }),
        ),
      );
      crown.position.set(hexSize * x, hexSize * 0.5, hexSize * (0.14 - index * 0.2));
      add(crown);
    });
    addFence(0, 0.5, 0.7, 0);
  }

  if (kind === "mine") {
    [-0.52, -0.35, -0.15, 0.1, 0.35, 0.54].forEach((x, index) => {
      const rock = shadowed(
        new THREE.Mesh(
          new THREE.DodecahedronGeometry(hexSize * (0.17 + (index % 3) * 0.035), 0),
          index % 2 ? stone : new THREE.MeshStandardMaterial({ color: "#929087", roughness: 1, flatShading: true }),
        ),
      );
      rock.scale.y = 0.7 + (index % 2) * 0.3;
      rock.position.set(hexSize * x, hexSize * (0.11 + (index % 2) * 0.05), hexSize * -0.18);
      add(rock);
    });
    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(hexSize * 0.36, hexSize * 0.34),
      darkStone,
    );
    portal.position.set(0, hexSize * 0.2, hexSize * -0.35);
    add(portal);
    [-0.21, 0.21].forEach((x) => {
      const post = shadowed(
        new THREE.Mesh(new THREE.BoxGeometry(hexSize * 0.07, hexSize * 0.43, hexSize * 0.08), darkWood),
      );
      post.position.set(hexSize * x, hexSize * 0.215, hexSize * -0.31);
      add(post);
    });
    const beam = shadowed(
      new THREE.Mesh(new THREE.BoxGeometry(hexSize * 0.5, hexSize * 0.075, hexSize * 0.09), darkWood),
    );
    beam.position.set(0, hexSize * 0.42, hexSize * -0.31);
    add(beam);
    [-0.13, 0.13].forEach((x) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(hexSize * 0.035, hexSize * 0.025, hexSize * 0.72),
        new THREE.MeshStandardMaterial({ color: "#626260", roughness: 0.72, metalness: 0.35 }),
      );
      rail.position.set(hexSize * x, hexSize * 0.035, hexSize * 0.18);
      add(rail);
    });
    const cart = shadowed(
      new THREE.Mesh(new THREE.BoxGeometry(hexSize * 0.32, hexSize * 0.18, hexSize * 0.25), earth),
    );
    cart.position.set(0, hexSize * 0.16, hexSize * 0.28);
    cart.rotation.x = -0.16;
    add(cart);
    [-0.13, 0.13].forEach((x) => {
      const wheel = shadowed(
        new THREE.Mesh(new THREE.CylinderGeometry(hexSize * 0.07, hexSize * 0.07, hexSize * 0.035, 10), darkStone),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(hexSize * x, hexSize * 0.07, hexSize * 0.28);
      add(wheel);
    });
  }

  if (kind === "market") {
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(hexSize * 0.68, hexSize * 0.72, hexSize * 0.035, 12),
      new THREE.MeshStandardMaterial({ color: "#b8a883", roughness: 1 }),
    );
    plaza.position.y = hexSize * 0.018;
    plaza.receiveShadow = true;
    add(plaza);
    const canopyColors = ["#b84f43", "#315f91", "#d2a242"];
    [
      [-0.36, -0.24, -0.05],
      [0.35, -0.19, 0.12],
      [0.02, 0.37, -0.08],
    ].forEach(([x, z, rotation], index) => {
      const counter = shadowed(
        new THREE.Mesh(new THREE.BoxGeometry(hexSize * 0.42, hexSize * 0.16, hexSize * 0.22), wood),
      );
      counter.position.set(hexSize * x, hexSize * 0.12, hexSize * z);
      counter.rotation.y = rotation;
      add(counter);
      const canopy = shadowed(
        new THREE.Mesh(
          new THREE.BoxGeometry(hexSize * 0.5, hexSize * 0.055, hexSize * 0.32),
          new THREE.MeshStandardMaterial({ color: canopyColors[index], roughness: 0.88 }),
        ),
      );
      canopy.position.set(hexSize * x, hexSize * 0.39, hexSize * z);
      canopy.rotation.y = rotation;
      add(canopy);
      [-0.18, 0.18].forEach((side) => {
        const post = shadowed(
          new THREE.Mesh(new THREE.CylinderGeometry(hexSize * 0.018, hexSize * 0.022, hexSize * 0.35, 7), darkWood),
        );
        post.position.set(hexSize * (x + side), hexSize * 0.22, hexSize * z);
        post.rotation.y = rotation;
        add(post);
      });
    });
    const tradePost = shadowed(
      new THREE.Mesh(new THREE.CylinderGeometry(hexSize * 0.035, hexSize * 0.045, hexSize * 0.54, 8), darkWood),
    );
    tradePost.position.set(0, hexSize * 0.27, 0);
    add(tradePost);
    const pennant = new THREE.Mesh(
      new THREE.PlaneGeometry(hexSize * 0.24, hexSize * 0.14),
      new THREE.MeshStandardMaterial({ color: "#c94f45", side: THREE.DoubleSide, roughness: 0.85 }),
    );
    pennant.position.set(hexSize * 0.12, hexSize * 0.48, 0);
    add(pennant);
  }

  return { group, selectableMeshes };
}
