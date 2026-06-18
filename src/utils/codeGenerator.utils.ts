export function codeGenerator() {
  const chars =
    "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let prefix = "";
  let mid1 = "";
  let mid2 = "";
  let mid3 = "";
  let suffix = "";

  for (let i = 0; i < 2; i++) {
    prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  for (let i = 0; i < 2; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  for (let i = 0; i < 2; i++) {
    mid1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  for (let i = 0; i < 2; i++) {
    mid2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  for (let i = 0; i < 2; i++) {
    mid3 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const fullCode = `TKC-${prefix}${mid1}${mid2}${mid3}${suffix}`;

  return fullCode;
}
