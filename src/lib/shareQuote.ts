import { Quote } from '../types';

export async function shareOrDownloadQuoteCard(quote: Quote): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'Unable to create image';

  // Background gradient #B3452E to #F58A6E at 135 deg
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#B3452E');
  grad.addColorStop(1, '#F58A6E');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, 1080, 1080, 72);
  ctx.fill();

  // Faint lotus watermark bottom right
  ctx.save();
  ctx.translate(880, 860);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.rotate((i * 26 * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, -70, 36, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Top-left pill "DAILY BOOST"
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(80, 80, 260, 64, 32);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('♥  DAILY BOOST', 114, 121);

  // Quote text wrapped
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 58px "Plus Jakarta Sans", system-ui, sans-serif';
  const words = `“${quote.text}”`.split(' ');
  let line = '';
  let y = 340;
  const maxWidth = 920;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, 80, y);
      line = word;
      y += 78;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, 80, y);
    y += 96;
  }

  // Mini prompt
  const promptText =
    quote.prompt || 'Take a slow breath before clicking back into focus.';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '500 36px "Inter", system-ui, sans-serif';
  ctx.fillText(promptText, 80, y + 20);

  // Footer brand & Original label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('HABIT FLOW', 80, 980);
  ctx.textAlign = 'right';
  ctx.fillText('Original', 1000, 980);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return 'Could not export image';

  const file = new File([blob], `habit-flow-${quote.id}.png`, {
    type: 'image/png',
  });

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: 'Habit Flow Daily Boost',
        text: quote.text,
        files: [file],
      });
      return 'Shared!';
    } catch {
      // User cancelled or share failed; fall back to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habit-flow-${quote.id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'Image downloaded';
}
