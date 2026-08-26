export interface PassportStamp {
  name: string;
  accent: string;
}

export interface PassportRenderOptions {
  title: string;
  visitor: string;
  issued: string;
  est: string;
  stamps: PassportStamp[];
  logoUrl: string;
  coverUrl: string;
  zh: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1 && ctx.measureText(text).width <= maxWidth) return [text];
  const tokens =
    words.length > 1 && !/[\u4e00-\u9fff]/.test(text) ? words : Array.from(text);
  const joiner = tokens === words ? ' ' : '';
  const lines: string[] = [];
  let cur = '';
  for (const token of tokens) {
    const next = cur ? `${cur}${joiner}${token}` : token;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = token;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    if (tokens.join(joiner).length > lines.join(joiner).length) {
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

export async function renderPassportImage(opts: PassportRenderOptions): Promise<Blob> {
  const W = 1080;
  const H = 1680;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }

  const display = opts.zh
    ? '"GBai Marker", Fredoka, "Noto Sans SC", sans-serif'
    : 'Fredoka, Nunito, sans-serif';
  const body = opts.zh
    ? '"JasonHandwriting2", Caveat, "Noto Sans SC", sans-serif'
    : 'Nunito, sans-serif';

  ctx.fillStyle = '#C6B6E8';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#FFF9EF';
  roundRect(ctx, 36, 36, W - 72, H - 72, 48);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 10;
  roundRect(ctx, 56, 56, W - 112, H - 112, 40);
  ctx.stroke();

  ctx.strokeStyle = '#FF9B9B';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  roundRect(ctx, 76, 76, W - 152, H - 152, 32);
  ctx.stroke();
  ctx.setLineDash([]);

  const photo = { x: 130, y: 120, w: 820, h: 460 };
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, photo.x - 18, photo.y - 18, photo.w + 36, photo.h + 86, 28);
  ctx.fill();

  let cover: HTMLImageElement | null = null;
  try {
    cover = await loadImage(opts.coverUrl);
  } catch {
    cover = null;
  }
  ctx.save();
  roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 18);
  ctx.clip();
  if (cover) {
    drawContained(ctx, cover, photo.x, photo.y, photo.w, photo.h);
  } else {
    ctx.fillStyle = '#E6DDF7';
    ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
  }
  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 18);
  ctx.stroke();

  let logo: HTMLImageElement | null = null;
  try {
    logo = await loadImage(opts.logoUrl);
  } catch {
    logo = null;
  }
  if (logo) {
    ctx.drawImage(logo, W / 2 - 40, photo.y + photo.h + 8, 80, 80);
  }

  ctx.fillStyle = '#4A4470';
  ctx.textAlign = 'center';
  ctx.font = `700 58px ${display}`;
  ctx.fillText(opts.title, W / 2, 760);

  ctx.fillStyle = '#7B74A3';
  ctx.font = `600 26px ${body}`;
  ctx.fillText(opts.visitor, W / 2, 802);
  ctx.font = `700 22px ${body}`;
  ctx.fillText(opts.issued, W / 2, 836);

  const cols = 2;
  const rows = 7;
  const gridX = 130;
  const gridY = 880;
  const cellW = (W - gridX * 2) / cols;
  const cellH = 92;

  opts.stamps.forEach((stamp, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (row >= rows) return;
    const left = gridX + col * cellW;
    const cy = gridY + row * cellH + 36;
    const cx = left + 36;

    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF3DF';
    ctx.fill();
    ctx.strokeStyle = stamp.accent;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.strokeStyle = '#7EC8E3';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#4A4470';
    ctx.font = `700 16px ${display}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1).padStart(2, '0'), cx, cy + 5);

    ctx.textAlign = 'left';
    ctx.font = `600 22px ${display}`;
    ctx.fillStyle = '#4A4470';
    const lines = fitText(ctx, stamp.name, cellW - 86, 2);
    lines.forEach((line, li) => {
      ctx.fillText(line, left + 70, cy + (li === 0 ? -4 : 20));
    });
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#E2635F';
  ctx.font = `700 24px ${body}`;
  ctx.fillText(opts.est, W / 2, H - 110);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('could not encode passport'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
