// ============================================================
// 胶片滤镜引擎 — 纯数据层（图像处理走 WebView Canvas）
// 完全兼容 Expo Go，无需原生模块
// ============================================================

export interface FilmFilterPreset {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  brand: string;
  isBW: boolean;
  canisterColor: string;
  overlayTint: string;
  overlayOpacity: number;
  overlayBlend: string;
  saturation: number;
  warmth: number;
  contrast: number;
  vignette: number;
  grain: number;
  lightLeak: number;
  lightLeakColor: string;
  borderStyle: 'none' | 'polaroid' | 'film-strip' | 'wide';
  fade: number;
}

export const FILM_PRESETS: FilmFilterPreset[] = [
  { id: 'portra400',  name: 'Portra 400',    subtitle: '柯达人像经典',     category: 'kodak', brand: 'Kodak', isBW: false, canisterColor: '#d4a574',
    overlayTint: 'rgba(212,165,116,1)',   overlayOpacity: 0.10, overlayBlend: 'warm',   saturation: 0.05, warmth: 18,  contrast: 0.90, vignette: 0.20,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'portra800',  name: 'Portra 800',    subtitle: '高感人像',         category: 'kodak', brand: 'Kodak', isBW: false, canisterColor: '#c9956a',
    overlayTint: 'rgba(200,150,100,1)',    overlayOpacity: 0.13, overlayBlend: 'warm',   saturation: 0.02, warmth: 22,  contrast: 0.95, vignette: 0.25,
    grain: 0.15, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'gold200',    name: 'Gold 200',      subtitle: '日常万能卷',       category: 'kodak', brand: 'Kodak', isBW: false, canisterColor: '#e8c56d',
    overlayTint: 'rgba(232,197,109,1)',    overlayOpacity: 0.12, overlayBlend: 'golden', saturation: 0.15, warmth: 14,  contrast: 1.05, vignette: 0.15,
    grain: 0.08, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'ektar100',   name: 'Ektar 100',     subtitle: '专业风光',         category: 'kodak', brand: 'Kodak', isBW: false, canisterColor: '#d98c45',
    overlayTint: 'rgba(217,140,69,1)',     overlayOpacity: 0.14, overlayBlend: 'vivid',  saturation: 0.30, warmth: 8,   contrast: 1.15, vignette: 0.18,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'trix400',    name: 'Tri-X 400',     subtitle: '经典黑白',         category: 'kodak', brand: 'Kodak', isBW: true,  canisterColor: '#555555',
    overlayTint: 'rgba(40,35,30,1)',      overlayOpacity: 0.22, overlayBlend: 'bw',      saturation: -1,   warmth: 0,   contrast: 1.35, vignette: 0.28,
    grain: 0.35, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'ektachrome', name: 'Ektachrome E100', subtitle: '经典反转片',      category: 'kodak', brand: 'Kodak', isBW: false, canisterColor: '#4a7ca8',
    overlayTint: 'rgba(74,124,168,1)',     overlayOpacity: 0.08, overlayBlend: 'slide',  saturation: 0.45, warmth: -5,  contrast: 1.25, vignette: 0.12,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'velvia50',   name: 'Velvia 50',     subtitle: '富士鲜艳',         category: 'fuji',  brand: 'Fuji',  isBW: false, canisterColor: '#5a9e4c',
    overlayTint: 'rgba(90,158,76,1)',      overlayOpacity: 0.11, overlayBlend: 'vivid',  saturation: 0.50, warmth: -8,  contrast: 1.30, vignette: 0.16,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'provia100f', name: 'Provia 100F',   subtitle: '专业中性',         category: 'fuji',  brand: 'Fuji',  isBW: false, canisterColor: '#6ba88a',
    overlayTint: 'rgba(107,168,138,1)',     overlayOpacity: 0.06, overlayBlend: 'neutral',saturation: 0.10, warmth: -2,  contrast: 1.10, vignette: 0.10,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'superia400', name: 'Superia 400',   subtitle: '消费级日常',       category: 'fuji',  brand: 'Fuji',  isBW: false, canisterColor: '#4a8fad',
    overlayTint: 'rgba(74,143,173,1)',     overlayOpacity: 0.09, overlayBlend: 'cool',   saturation: 0.08, warmth: -12, contrast: 1.00, vignette: 0.18,
    grain: 0.10, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'c200',       name: 'C200',          subtitle: '入门经济卷',       category: 'fuji',  brand: 'Fuji',  isBW: false, canisterColor: '#7ab09a',
    overlayTint: 'rgba(122,176,154,1)',     overlayOpacity: 0.07, overlayBlend: 'soft',   saturation: 0.03, warmth: -6,  contrast: 0.92, vignette: 0.14,
    grain: 0.12, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'astia100',   name: 'Astia 100',     subtitle: '柔和人像',         category: 'fuji',  brand: 'Fuji',  isBW: false, canisterColor: '#d4b87a',
    overlayTint: 'rgba(212,184,122,1)',     overlayOpacity: 0.07, overlayBlend: 'soft',   saturation: -0.05,warmth: 6,   contrast: 0.88, vignette: 0.12,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'hp5plus',    name: 'HP5 Plus',      subtitle: '伊尔福经典黑白',   category: 'ilford',brand: 'Ilford',isBW: true,  canisterColor: '#3a3a3a',
    overlayTint: 'rgba(35,32,28,1)',      overlayOpacity: 0.26, overlayBlend: 'bw-contrast', saturation: -1, warmth: 0,   contrast: 1.28, vignette: 0.30,
    grain: 0.40, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'delta400',   name: 'Delta 400',     subtitle: '细腻层次',         category: 'ilford',brand: 'Ilford',isBW: true,  canisterColor: '#606060',
    overlayTint: 'rgba(45,42,38,1)',      overlayOpacity: 0.18, overlayBlend: 'bw-smooth', saturation: -1, warmth: 0,   contrast: 1.10, vignette: 0.22,
    grain: 0.15, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'fp4plus',    name: 'FP4 Plus',      subtitle: '传统颗粒',         category: 'ilford',brand: 'Ilford',isBW: true,  canisterColor: '#787878',
    overlayTint: 'rgba(50,47,43,1)',      overlayOpacity: 0.20, overlayBlend: 'bw-grain', saturation: -1, warmth: 0,   contrast: 1.15, vignette: 0.25,
    grain: 0.30, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'cinestill800t', name: '800T',       subtitle: '霓虹夜景电影卷',   category: 'cinestill', brand: 'CineStill', isBW: false, canisterColor: '#8b3a62',
    overlayTint: 'rgba(139,58,98,1)',      overlayOpacity: 0.15, overlayBlend: 'neon',   saturation: 0.20, warmth: -15, contrast: 1.18, vignette: 0.22,
    grain: 0.20, lightLeak: 0.15, lightLeakColor: 'rgba(255,100,150,0.25)', borderStyle: 'none', fade: 0 },
  { id: 'cinestill50d',  name: '50D',        subtitle: '日光电影卷',       category: 'cinestill', brand: 'CineStill', isBW: false, canisterColor: '#6a9ebd',
    overlayTint: 'rgba(106,158,189,1)',     overlayOpacity: 0.07, overlayBlend: 'daylight-cine',saturation: 0.12, warmth: 2, contrast: 1.08, vignette: 0.10,
    grain: 0, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'canon_ixus', name: 'Canon IXUS',   subtitle: '冷白皮粉调',       category: 'ccd',   brand: 'CCD',   isBW: false, canisterColor: '#c8b8d8',
    overlayTint: 'rgba(200,184,216,1)',     overlayOpacity: 0.08, overlayBlend: 'ccd-cool', saturation: -0.15,warmth: -10, contrast: 1.05, vignette: 0.08,
    grain: 0.05, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'olympus_u',  name: 'Olympus μ',    subtitle: '奶油青橙',         category: 'ccd',   brand: 'CCD',   isBW: false, canisterColor: '#8fcfa8',
    overlayTint: 'rgba(143,207,168,1)',     overlayOpacity: 0.09, overlayBlend: 'ccd-cream',saturation: 0.05, warmth: 4,   contrast: 0.95, vignette: 0.10,
    grain: 0.08, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'sony_w200',  name: 'Sony W200',    subtitle: '街拍冷灰',         category: 'ccd',   brand: 'CCD',   isBW: false, canisterColor: '#a8b8c8',
    overlayTint: 'rgba(168,184,200,1)',     overlayOpacity: 0.10, overlayBlend: 'ccd-cold', saturation: -0.20,warmth: -18, contrast: 1.08, vignette: 0.12,
    grain: 0.10, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'ricoh_gr',   name: 'Ricoh GR',     subtitle: '高对比街拍',       category: 'ccd',   brand: 'CCD',   isBW: false, canisterColor: '#b8a888',
    overlayTint: 'rgba(184,168,136,1)',     overlayOpacity: 0.07, overlayBlend: 'ccd-snap', saturation: -0.08, warmth: -5,  contrast: 1.20, vignette: 0.15,
    grain: 0.12, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'polaroid600',name: 'Polaroid 600',  subtitle: '梦幻褪色',         category: 'polaroid',brand: 'Polaroid',isBW: false, canisterColor: '#c89878',
    overlayTint: 'rgba(200,152,120,1)',     overlayOpacity: 0.18, overlayBlend: 'dream',  saturation: -0.25,warmth: 12,  contrast: 0.85, vignette: 0.30,
    grain: 0.15, lightLeak: 0.10, lightLeakColor: 'rgba(255,200,150,0.2)', borderStyle: 'polaroid', fade: 0.20 },
  { id: 'sx70',       name: 'SX-70',        subtitle: '温暖怀旧',         category: 'polaroid',brand: 'Polaroid',isBW: false, canisterColor: '#d4a868',
    overlayTint: 'rgba(212,168,104,1)',     overlayOpacity: 0.14, overlayBlend: 'vintage-warm',saturation: -0.15,warmth: 18,  contrast: 0.90, vignette: 0.25,
    grain: 0.12, lightLeak: 0.08, lightLeakColor: 'rgba(255,180,100,0.18)', borderStyle: 'polaroid', fade: 0.15 },
  { id: 'polaroid_bw',name: 'Polaroid B&W', subtitle: '即时黑白',         category: 'polaroid',brand: 'Polaroid',isBW: true,  canisterColor: '#888888',
    overlayTint: 'rgba(55,50,45,1)',      overlayOpacity: 0.24, overlayBlend: 'inst-bw', saturation: -1,   warmth: 4,   contrast: 1.12, vignette: 0.28,
    grain: 0.25, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'polaroid', fade: 0.10 },
  { id: 'agfavista',  name: 'Vista 200',     subtitle: '欧式蓝绿冷艳',     category: 'agfa',  brand: 'Agfa',  isBW: false, canisterColor: '#4a8a9a',
    overlayTint: 'rgba(74,138,154,1)',     overlayOpacity: 0.12, overlayBlend: 'eu-cool', saturation: 0.03, warmth: -20, contrast: 1.02, vignette: 0.18,
    grain: 0.10, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  
  // ============================================================
  // 复古风格滤镜
  // ============================================================
  { id: 'vintage_yellow', name: '老照片泛黄',   subtitle: '岁月痕迹',         category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#c9a858',
    overlayTint: 'rgba(201,168,88,1)',     overlayOpacity: 0.25, overlayBlend: 'old',   saturation: -0.35, warmth: 25,  contrast: 0.82, vignette: 0.35,
    grain: 0.28, lightLeak: 0.05, lightLeakColor: 'rgba(255,200,100,0.15)', borderStyle: 'wide', fade: 0.30 },
  { id: 'lomo_style',     name: 'LOMO风格',     subtitle: '暗角迷幻',         category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#b85a7a',
    overlayTint: 'rgba(184,90,122,1)',     overlayOpacity: 0.18, overlayBlend: 'lomo',  saturation: 0.45, warmth: -5,  contrast: 1.45, vignette: 0.55,
    grain: 0.22, lightLeak: 0.35, lightLeakColor: 'rgba(255,100,200,0.35)', borderStyle: 'none', fade: 0 },
  { id: 'film_grain',     name: '胶片颗粒',     subtitle: '颗粒质感',         category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#7a6a5a',
    overlayTint: 'rgba(122,106,90,1)',     overlayOpacity: 0.08, overlayBlend: 'grain',  saturation: 0,     warmth: 0,   contrast: 1.05, vignette: 0.10,
    grain: 0.55, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'bw_high_contrast', name: '高对比黑白', subtitle: '强烈反差',         category: 'vintage', brand: 'Vintage', isBW: true,  canisterColor: '#2a2a2a',
    overlayTint: 'rgba(25,22,18,1)',      overlayOpacity: 0.30, overlayBlend: 'bw-hard', saturation: -1,   warmth: 0,   contrast: 1.60, vignette: 0.40,
    grain: 0.38, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'none', fade: 0 },
  { id: 'light_leak',     name: '漏光效果',     subtitle: '光影斑驳',         category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#d87a9a',
    overlayTint: 'rgba(216,122,154,1)',     overlayOpacity: 0.10, overlayBlend: 'leak',  saturation: 0.15, warmth: 10,  contrast: 0.95, vignette: 0.15,
    grain: 0.15, lightLeak: 0.55, lightLeakColor: 'rgba(255,150,200,0.45)', borderStyle: 'none', fade: 0 },
  { id: 'vintage_wide',   name: '宽幅胶片',     subtitle: '宽屏电影感',       category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#5a7a9a',
    overlayTint: 'rgba(90,122,154,1)',     overlayOpacity: 0.06, overlayBlend: 'cinema', saturation: 0.05, warmth: -3,  contrast: 1.12, vignette: 0.15,
    grain: 0.18, lightLeak: 0.08, lightLeakColor: 'rgba(200,200,255,0.2)', borderStyle: 'wide', fade: 0 },
  { id: 'vintage_fade',   name: '复古褪色',     subtitle: '回忆的色调',       category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#a89a8a',
    overlayTint: 'rgba(168,154,138,1)',     overlayOpacity: 0.20, overlayBlend: 'fade',  saturation: -0.45, warmth: 15,  contrast: 0.78, vignette: 0.28,
    grain: 0.20, lightLeak: 0.12, lightLeakColor: 'rgba(255,220,180,0.2)', borderStyle: 'film-strip', fade: 0.35 },
  { id: 'sepia_vintage',  name: '深褐色调',     subtitle: '古典怀旧',         category: 'vintage', brand: 'Vintage', isBW: false, canisterColor: '#8a6a4a',
    overlayTint: 'rgba(138,106,74,1)',     overlayOpacity: 0.30, overlayBlend: 'sepia',  saturation: -0.25, warmth: 30,  contrast: 0.95, vignette: 0.32,
    grain: 0.25, lightLeak: 0, lightLeakColor: 'rgba(255,200,100,0.3)', borderStyle: 'polaroid', fade: 0.20 },
];

export interface FilterCategory {
  id: string;
  name: string;
}

const CATEGORIES: FilterCategory[] = [
  { id: 'all',       name: '全部' },
  { id: 'kodak',     name: 'Kodak' },
  { id: 'fuji',      name: 'Fuji' },
  { id: 'ilford',    name: 'Ilford' },
  { id: 'cinestill', name: 'CineStill' },
  { id: 'ccd',       name: 'CCD' },
  { id: 'polaroid',  name: 'Polaroid' },
  { id: 'agfa',      name: 'Agfa' },
  { id: 'vintage',   name: '复古' },
];

export function getCategories(): FilterCategory[] {
  return CATEGORIES;
}

export function getFiltersByCategory(categoryId: string): FilmFilterPreset[] {
  if (categoryId === 'all') return FILM_PRESETS;
  return FILM_PRESETS.filter((p) => p.category === categoryId);
}

export function getFilterColor(filter: FilmFilterPreset): string {
  return filter.canisterColor;
}

export function getFilterPreviewConfig(preset: FilmFilterPreset): {
  tintColor: string;
  opacity: number;
  isBW: boolean;
} {
  let effectiveOpacity = preset.overlayOpacity;

  if (preset.isBW) {
    effectiveOpacity = 0.35 + preset.vignette * 0.25;
  } else {
    effectiveOpacity = preset.overlayOpacity * 1.2;
  }

  effectiveOpacity = Math.min(0.7, Math.max(0.05, effectiveOpacity));

  return {
    tintColor: preset.overlayTint,
    opacity: effectiveOpacity,
    isBW: preset.isBW,
  };
}

// ============================================================
// WebView Canvas 滤镜处理 HTML 页面
// ============================================================

/**
 * 解析 overlayTint 中的 RGB 值
 */
function parseTint(tint: string): { r: number; g: number; b: number } {
  const match = tint.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

/**
 * 生成包含 Canvas 滤镜处理逻辑的完整 HTML 页面
 * 通过 postMessage 与 React Native 通信
 */
export function createFilterProcessorHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; }
  body { background: #000; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');

  function clamp(v) {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return Math.round(v);
  }

  function applyFilter(img, params) {
    var w = img.width;
    var h = img.height;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    var imageData = ctx.getImageData(0, 0, w, h);
    var data = imageData.data;

    // 1. 黑白转换
    if (params.isBW) {
      for (var i = 0; i < data.length; i += 4) {
        var gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
    }

    // 2. 饱和度
    if (params.saturation !== undefined && params.saturation !== 0 && !params.isBW) {
      var sat = params.saturation;
      for (var i = 0; i < data.length; i += 4) {
        var lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = clamp(lum + (1 + sat) * (data[i] - lum));
        data[i + 1] = clamp(lum + (1 + sat) * (data[i + 1] - lum));
        data[i + 2] = clamp(lum + (1 + sat) * (data[i + 2] - lum));
      }
    }

    // 3. 对比度
    if (params.contrast !== undefined && params.contrast !== 1) {
      var c = params.contrast;
      var offset = 128 * (1 - c);
      for (var i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] * c + offset);
        data[i + 1] = clamp(data[i + 1] * c + offset);
        data[i + 2] = clamp(data[i + 2] * c + offset);
      }
    }

    // 4. 色温（正确的颜色温度偏移：暖色加红减蓝，冷色反之）
    if (params.warmth !== undefined && params.warmth !== 0) {
      var wt = params.warmth;
      for (var i = 0; i < data.length; i += 4) {
        data[i]     = clamp(data[i] + wt * 1.0);
        data[i + 1] = clamp(data[i + 1] + wt * 0.25);
        data[i + 2] = clamp(data[i + 2] - wt * 0.7);
      }
    }

    // 5. 颜色叠加层
    if (params.tintR !== undefined && params.tintOpacity > 0.005) {
      var o = params.tintOpacity;
      var factorR = 1 - (1 - params.tintR / 255) * o;
      var factorG = 1 - (1 - params.tintG / 255) * o;
      var factorB = 1 - (1 - params.tintB / 255) * o;
      for (var i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] * factorR);
        data[i + 1] = clamp(data[i + 1] * factorG);
        data[i + 2] = clamp(data[i + 2] * factorB);
      }
    }

    // 6. 暗角（smoothstep 曲线，更真实的胶片暗角渐变）
    if (params.vignette !== undefined && params.vignette > 0.01) {
      var cx = w / 2, cy = h / 2;
      var maxR = Math.sqrt(cx * cx + cy * cy);
      var vigStrength = params.vignette;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var dx = (x - cx) / cx, dy = (y - cy) / cy;
          var dist = Math.sqrt(dx * dx + dy * dy);
          // smoothstep: 在 0.5~1.2 范围内平滑过渡
          var edge = Math.max(0, Math.min(1, (dist - 0.5) / 0.7));
          var smooth = edge * edge * (3 - 2 * edge);
          var darken = 1 - smooth * vigStrength;
          var idx = (y * w + x) * 4;
          data[idx] = clamp(data[idx] * darken);
          data[idx + 1] = clamp(data[idx + 1] * darken);
          data[idx + 2] = clamp(data[idx + 2] * darken);
        }
      }
    }

    // 7. 褪色效果
    if (params.fade !== undefined && params.fade > 0.01) {
      var fadeLevel = params.fade;
      for (var i = 0; i < data.length; i += 4) {
        var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = clamp(data[i] + (avg - data[i]) * fadeLevel * 0.6);
        data[i + 1] = clamp(data[i + 1] + (avg - data[i + 1]) * fadeLevel * 0.6);
        data[i + 2] = clamp(data[i + 2] + (avg - data[i + 2]) * fadeLevel * 0.6);
      }
    }

    // 8. 胶片颗粒效果（高斯分布 + 亮度自适应，更真实）
    if (params.grain !== undefined && params.grain > 0.01) {
      var grainIntensity = params.grain * 40;
      for (var i = 0; i < data.length; i += 4) {
        // Box-Muller 变换生成高斯噪声
        var u1 = Math.random(), u2 = Math.random();
        while (u1 === 0) u1 = Math.random();
        var gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        // 亮度自适应：暗部颗粒更多
        var lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        var adaptive = 1.2 - lum * 0.6;
        var noise = gaussian * grainIntensity * adaptive * 0.5;
        data[i] = clamp(data[i] + noise);
        data[i + 1] = clamp(data[i + 1] + noise);
        data[i + 2] = clamp(data[i + 2] + noise);
      }
    }

    // 9. 漏光效果
    if (params.lightLeak !== undefined && params.lightLeak > 0.01) {
      var leakOpacity = params.lightLeak;
      var leakR = params.lightLeakR || 255;
      var leakG = params.lightLeakG || 200;
      var leakB = params.lightLeakB || 100;
      
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var tFactor = Math.pow(1 - y / h, 3);
          var bFactor = Math.pow(y / h, 3);
          var lFactor = Math.pow(1 - x / w, 3);
          var rFactor = Math.pow(x / w, 3);
          var edgeFactor = tFactor + bFactor + lFactor + rFactor;
          var leakAmount = edgeFactor * leakOpacity * 0.6;
          
          if (leakAmount > 0.01) {
            var idx = (y * w + x) * 4;
            data[idx] = clamp(data[idx] + (leakR - data[idx]) * leakAmount);
            data[idx + 1] = clamp(data[idx + 1] + (leakG - data[idx + 1]) * leakAmount);
            data[idx + 2] = clamp(data[idx + 2] + (leakB - data[idx + 2]) * leakAmount);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 10. 胶片 S 曲线（模拟真实胶片的肩部和趾部压制）
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    // 11. 边框效果
    if (params.borderStyle && params.borderStyle !== 'none') {
      if (params.borderStyle === 'polaroid') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -10, w + 20, h + 20);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, h, w, h * 0.15);
      } else if (params.borderStyle === 'wide') {
        ctx.fillStyle = '#1a1a1a';
        var barsHeight = h * 0.12;
        ctx.fillRect(0, -barsHeight, w, barsHeight);
        ctx.fillRect(0, h, w, barsHeight);
      } else if (params.borderStyle === 'film-strip') {
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(-15, 0, 15, h);
        ctx.fillRect(w, 0, 15, h);
        ctx.fillStyle = '#1a1a1a';
        var stripHeight = h * 0.08;
        ctx.fillRect(-15, -stripHeight, w + 30, stripHeight);
        ctx.fillRect(-15, h, w + 30, stripHeight);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.98);
  }

  // 监听 React Native 消息
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'process') {
        var img = new Image();
        img.onload = function() {
          var result = applyFilter(img, msg.params);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            id: msg.id,
            type: 'result',
            data: result
          }));
        };
        img.onerror = function(err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            id: msg.id,
            type: 'error',
            error: 'Failed to load image'
          }));
        };
        img.src = msg.imageData;
      }
    } catch (err) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        error: err.message
      }));
    }
  });

  // 通知 RN WebView 已就绪
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body>
</html>`;
}

/**
 * 构建传给 WebView 的滤镜参数对象
 */
export function buildFilterParams(preset: FilmFilterPreset) {
  const tint = parseTint(preset.overlayTint);
  const leakColor = parseTint(preset.lightLeakColor);
  return {
    isBW: preset.isBW,
    saturation: preset.saturation,
    contrast: preset.contrast,
    warmth: preset.warmth,
    tintR: tint.r,
    tintG: tint.g,
    tintB: tint.b,
    tintOpacity: preset.overlayOpacity,
    vignette: preset.vignette,
    grain: preset.grain,
    lightLeak: preset.lightLeak,
    lightLeakR: leakColor.r,
    lightLeakG: leakColor.g,
    lightLeakB: leakColor.b,
    borderStyle: preset.borderStyle,
    fade: preset.fade,
  };
}
