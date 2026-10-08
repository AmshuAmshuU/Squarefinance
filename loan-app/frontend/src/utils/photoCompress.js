// Turns a phone photo into a small passport-style picture before it is uploaded:
// 35 x 45 mm proportions (413 x 531 px) as a JPEG of at most ~100 KB.

export const PASSPORT_ASPECT = 35 / 45;
const OUT_W = 413;
const OUT_H = 531;
export const MAX_BYTES = 100 * 1024;
const WORK_MAX_SIDE = 1600; // the framing screen works on a smaller copy so cheap phones stay fast

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that picture"));
    img.src = url;
  });

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

// Step 1: shrink the chosen/taken photo to a manageable size for framing.
// Returns an object URL (caller should revoke it when done) of a JPEG.
export const prepareForFraming = async (file) => {
  const srcUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(srcUrl);
    const scale = Math.min(1, WORK_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 0.92);
    if (!blob) throw new Error("Could not prepare that picture");
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
};

// Step 2: cut out the framed area, shrink to passport size, and lower the JPEG
// quality (then the size, if needed) until it is under ~100 KB.
export const cropAndCompress = async (framedUrl, areaPixels) => {
  const img = await loadImage(framedUrl);
  let smallest = null;
  for (const scale of [1, 0.85, 0.7]) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(OUT_W * scale);
    canvas.height = Math.round(OUT_H * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, areaPixels.x, areaPixels.y, areaPixels.width, areaPixels.height, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= MAX_BYTES) return blob;
    }
  }
  if (smallest && smallest.size <= MAX_BYTES * 1.5) return smallest;
  throw new Error("Could not make the photo small enough - please try another picture");
};
