export function modifyToContrast(
  modColor: string,
  baseColor = '#FFFFFF',
  targetContrast = 4.5,
): string {
  const toLuminance = (rgb: [number, number, number]): number => {
    const a = rgb.map(v => {
      const srgb = v / 255;
      return srgb <= 0.03928
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };

  const contrast = (
    rgb1: [number, number, number],
    rgb2: [number, number, number],
  ): number => {
    const L1 = toLuminance(rgb1);
    const L2 = toLuminance(rgb2);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const hexToRgb = (inputHex: string): [number, number, number] => {
    let hex = inputHex.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(c => c + c)
        .join('');
    }
    const int = parseInt(hex, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  };

  const rgbToHex = (rgb: [number, number, number]): string =>
    `#${rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

  const clamp = (val: number, min: number, max: number): number =>
    Math.min(Math.max(val, min), max);

  const baseRgb = hexToRgb(baseColor);
  const modRgb = hexToRgb(modColor);

  let bestMatch: [number, number, number] = modRgb;
  const step = 1;

  for (let i = 0; i <= 100; i += step) {
    const lightened: [number, number, number] = [
      clamp(modRgb[0] + i, 0, 255),
      clamp(modRgb[1] + i, 0, 255),
      clamp(modRgb[2] + i, 0, 255),
    ];
    if (contrast(baseRgb, lightened) >= targetContrast) {
      bestMatch = lightened;
      break;
    }

    const darkened: [number, number, number] = [
      clamp(modRgb[0] - i, 0, 255),
      clamp(modRgb[1] - i, 0, 255),
      clamp(modRgb[2] - i, 0, 255),
    ];
    if (contrast(baseRgb, darkened) >= targetContrast) {
      bestMatch = darkened;
      break;
    }
  }

  return rgbToHex(bestMatch);
}
