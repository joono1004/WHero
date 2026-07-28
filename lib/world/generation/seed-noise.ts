export function seededHash(seed: number, x: number, y: number) {
  let value =
    seed ^
    Math.imul(x + 31, 374761393) ^
    Math.imul(y + 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

export function terrainNoise(seed: number, x: number, z: number) {
  return (
    Math.sin(x * 0.43 + seed * 0.00013) * 0.16 +
    Math.cos(z * 0.37 - seed * 0.00017) * 0.13 +
    Math.sin((x + z) * 0.71 + seed * 0.00007) * 0.07
  );
}

export function biomeNoise(seed: number, x: number, z: number) {
  return (
    Math.sin(x * 0.16 + z * 0.08 + seed * 0.00029) * 0.5 +
    Math.cos(x * 0.1 - z * 0.19 + seed * 0.00041) * 0.35 +
    Math.sin((x + z) * 0.07 + seed * 0.00017) * 0.15
  );
}
