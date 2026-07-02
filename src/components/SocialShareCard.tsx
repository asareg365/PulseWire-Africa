import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Copy, Check, Sparkles, Image, RefreshCw, Smartphone, Grid, Share2, Facebook, Twitter, PhoneCall } from 'lucide-react';
import { Article } from '../types';

interface SocialShareCardProps {
  article: Article;
  onShareLogged?: () => void;
}

type AspectRatio = '1:1' | '9:16';
type DesignTheme = 'emerald' | 'sahara' | 'ivory' | 'pitch';

export default function SocialShareCard({ article, onShareLogged }: SocialShareCardProps) {
  const [aspect, setAspect] = useState<AspectRatio>('1:1');
  const [theme, setTheme] = useState<DesignTheme>('emerald');
  const [customText, setCustomText] = useState(article.summary || '');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate Caption template
  const shareLink = `${window.location.origin}/article/${article.slug}`;
  const getFormattedCaption = () => {
    return `🔥 Breaking on PulseWire Africa:\n\n*"${article.title}"*\n\n${customText}\n\nRead the full story here:\n👉 ${shareLink}\n\n#PulseWireAfrica #GhanaNews #AfricaStories #${article.category.replace(/\s+/g, '')}`;
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(getFormattedCaption());
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    if (onShareLogged) onShareLogged();
  };

  const handleCopyLinkOnly = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    if (onShareLogged) onShareLogged();
  };

  // Canvas drawing function
  const generateAndDownloadCanvas = async () => {
    setIsDownloading(true);
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsDownloading(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsDownloading(false);
      return;
    }

    // Set resolutions based on aspect ratios
    const width = aspect === '1:1' ? 1080 : 1080;
    const height = aspect === '1:1' ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // Define colors based on selected theme
    let bgGradient: CanvasGradient;
    let textColor = '#FFFFFF';
    let subtitleColor = '#94A3B8';
    let accentColor = '#10B981'; // Emerald
    let badgeBg = '#064E3B';
    let badgeText = '#10B981';

    if (theme === 'emerald') {
      bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#020617'); // Dark slate slate-950
      bgGradient.addColorStop(0.5, '#0F172A'); // slate-900
      bgGradient.addColorStop(1, '#022C22'); // deep emerald emerald-950
    } else if (theme === 'sahara') {
      bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#090500'); // extremely dark brown
      bgGradient.addColorStop(0.6, '#1C1001'); // dark amber
      bgGradient.addColorStop(1, '#2E1500'); // sahara dust amber-950
      accentColor = '#F59E0B'; // Amber
      badgeBg = '#451A03';
      badgeText = '#F59E0B';
    } else if (theme === 'pitch') {
      bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#030712'); // gray-950
      bgGradient.addColorStop(1, '#0F172A'); // slate-900
      accentColor = '#EC4899'; // Vibrant pink/magenta accent
      badgeBg = '#500724';
      badgeText = '#F472B6';
    } else { // ivory (Light Theme)
      bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#FDFBF7'); // warm cream
      bgGradient.addColorStop(1, '#F5F2EB'); // ivory
      textColor = '#0F172A'; // dark slate
      subtitleColor = '#475569'; // slate-600
      accentColor = '#DC2626'; // Red accent
      badgeBg = '#FEE2E2';
      badgeText = '#DC2626';
    }

    // Fill background
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative geometric patterns
    ctx.strokeStyle = theme === 'ivory' ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 0; j < height; j += 80) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    // Try drawing the featured image
    const drawContent = (imageLoaded: boolean, imgElement?: HTMLImageElement) => {
      let currentY = 0;

      if (aspect === '1:1') {
        // --- 1:1 SQUARE LAYOUT ---
        const imageHeight = 500;
        
        if (imageLoaded && imgElement) {
          // Calculate source clipping for cover aspect-fit
          const imgRatio = imgElement.width / imgElement.height;
          const targetRatio = width / imageHeight;
          let sWidth = imgElement.width;
          let sHeight = imgElement.height;
          let sx = 0;
          let sy = 0;

          if (imgRatio > targetRatio) {
            sWidth = imgElement.height * targetRatio;
            sx = (imgElement.width - sWidth) / 2;
          } else {
            sHeight = imgElement.width / targetRatio;
            sy = (imgElement.height - sHeight) / 2;
          }

          ctx.drawImage(imgElement, sx, sy, sWidth, sHeight, 0, 0, width, imageHeight);
        } else {
          // Draw a stylized abstract graphic placeholder
          const grad = ctx.createLinearGradient(0, 0, width, imageHeight);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(1, theme === 'ivory' ? '#E2E8F0' : '#1E293B');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, imageHeight);

          // Grid accents
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 4;
          ctx.strokeRect(40, 40, width - 80, imageHeight - 80);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PULSEWIRE AFRICA', width / 2, imageHeight / 2 - 10);
          ctx.font = 'italic 24px Georgia, serif';
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillText('Voice of African Stories', width / 2, imageHeight / 2 + 30);
        }

        // Drop shadow bar or division line
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, imageHeight, width, 8);

        // Content Area Starting Y
        currentY = imageHeight + 60;

        // Draw Category Badge
        ctx.fillStyle = badgeBg;
        const badgeTextStr = article.category.toUpperCase();
        ctx.font = 'bold 20px "JetBrains Mono", monospace, sans-serif';
        const textWidth = ctx.measureText(badgeTextStr).width;
        
        // Draw rounded pill badge
        const badgeX = 60;
        const badgeY = currentY;
        const badgeW = textWidth + 30;
        const badgeH = 38;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();

        ctx.fillStyle = badgeText;
        ctx.textAlign = 'left';
        ctx.fillText(badgeTextStr, badgeX + 15, badgeY + 26);

        // Date indicator
        ctx.fillStyle = subtitleColor;
        ctx.font = '500 18px sans-serif';
        const publishDate = new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        ctx.fillText(publishDate, badgeX + badgeW + 20, badgeY + 25);

        currentY += 80;

        // Article Title (Serif/Sans Bold)
        ctx.fillStyle = textColor;
        ctx.font = 'bold 44px Georgia, serif, sans-serif';
        const maxTitleWidth = width - 120;
        const words = article.title.split(' ');
        let line = '';
        const lines: string[] = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTitleWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Limit to 3 lines
        const drawLines = lines.slice(0, 3);
        drawLines.forEach((titleLine) => {
          ctx.fillText(titleLine.trim(), 60, currentY);
          currentY += 54;
        });

        // Excerpt text / Summary
        currentY += 15;
        ctx.fillStyle = subtitleColor;
        ctx.font = '500 22px sans-serif';
        const maxSummaryWidth = width - 120;
        const summaryWords = customText.split(' ');
        let sLine = '';
        const sLines: string[] = [];

        for (let m = 0; m < summaryWords.length; m++) {
          const testLine = sLine + summaryWords[m] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxSummaryWidth && m > 0) {
            sLines.push(sLine);
            sLine = summaryWords[m] + ' ';
          } else {
            sLine = testLine;
          }
        }
        sLines.push(sLine);

        // Draw up to 2 lines
        sLines.slice(0, 2).forEach((sumLine) => {
          ctx.fillText(sumLine.trim(), 60, currentY);
          currentY += 32;
        });

        // Footer block
        const footerY = height - 80;
        ctx.fillStyle = theme === 'ivory' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(60, footerY - 20, width - 120, 2);

        // PulseWire Africa branding + URL
        ctx.fillStyle = accentColor;
        ctx.font = '900 24px sans-serif';
        ctx.fillText('PULSEWIRE', 60, footerY + 20);
        
        ctx.fillStyle = theme === 'ivory' ? '#0F172A' : '#FFFFFF';
        ctx.font = '900 24px sans-serif';
        const pulseWidth = ctx.measureText('PULSEWIRE').width;
        ctx.fillText('AFRICA', 60 + pulseWidth + 2, footerY + 20);

        ctx.fillStyle = subtitleColor;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('pulsewire.africa', width - 60, footerY + 20);

      } else {
        // --- 9:16 VERTICAL STORY LAYOUT ---
        // Beautiful Top Margin Brand
        ctx.fillStyle = accentColor;
        ctx.font = '900 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PULSEWIRE AFRICA', width / 2, 100);

        ctx.fillStyle = subtitleColor;
        ctx.font = 'bold 16px monospace';
        ctx.fillText('BREAKING EDITORIAL COVERAGE', width / 2, 130);

        // Large centered image
        const imageHeight = 650;
        const imageY = 200;
        
        if (imageLoaded && imgElement) {
          const imgRatio = imgElement.width / imgElement.height;
          const targetRatio = (width - 120) / imageHeight;
          let sWidth = imgElement.width;
          let sHeight = imgElement.height;
          let sx = 0;
          let sy = 0;

          if (imgRatio > targetRatio) {
            sWidth = imgElement.height * targetRatio;
            sx = (imgElement.width - sWidth) / 2;
          } else {
            sHeight = imgElement.width / targetRatio;
            sy = (imgElement.height - sHeight) / 2;
          }

          // Draw image with nice border
          ctx.drawImage(imgElement, sx, sy, sWidth, sHeight, 60, imageY, width - 120, imageHeight);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(60, imageY, width - 120, imageHeight);
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(60, imageY, width - 120, imageHeight);
        }

        // Division line
        ctx.fillStyle = accentColor;
        ctx.fillRect(60, imageY + imageHeight, width - 120, 6);

        currentY = imageY + imageHeight + 60;

        // Draw Category Badge (Centered)
        ctx.fillStyle = badgeBg;
        const badgeTextStr = article.category.toUpperCase();
        ctx.font = 'bold 22px monospace';
        const textWidth = ctx.measureText(badgeTextStr).width;
        
        const badgeW = textWidth + 36;
        const badgeH = 44;
        const badgeX = (width - badgeW) / 2;
        
        ctx.beginPath();
        ctx.roundRect(badgeX, currentY, badgeW, badgeH, 10);
        ctx.fill();

        ctx.fillStyle = badgeText;
        ctx.textAlign = 'center';
        ctx.fillText(badgeTextStr, width / 2, currentY + 30);

        currentY += 100;

        // Article Title (Big & Centered)
        ctx.fillStyle = textColor;
        ctx.font = 'bold 50px Georgia, serif';
        const maxTitleWidth = width - 140;
        const words = article.title.split(' ');
        let line = '';
        const lines: string[] = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTitleWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        lines.slice(0, 4).forEach((titleLine) => {
          ctx.fillText(titleLine.trim(), width / 2, currentY);
          currentY += 62;
        });

        // Excerpt
        currentY += 20;
        ctx.fillStyle = subtitleColor;
        ctx.font = '500 24px sans-serif';
        const maxSummaryWidth = width - 160;
        const summaryWords = customText.split(' ');
        let sLine = '';
        const sLines: string[] = [];

        for (let m = 0; m < summaryWords.length; m++) {
          const testLine = sLine + summaryWords[m] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxSummaryWidth && m > 0) {
            sLines.push(sLine);
            sLine = summaryWords[m] + ' ';
          } else {
            sLine = testLine;
          }
        }
        sLines.push(sLine);

        sLines.slice(0, 3).forEach((sumLine) => {
          ctx.fillText(sumLine.trim(), width / 2, currentY);
          currentY += 36;
        });

        // Bottom QR Callout frame
        const bottomY = height - 160;
        
        // Scan instructions
        ctx.fillStyle = subtitleColor;
        ctx.font = '500 20px sans-serif';
        ctx.fillText('Swipe Up or scan QR to read full story', width / 2, bottomY);

        // Abstract QR graphics simulation to look super authentic!
        const qrSize = 90;
        const qrX = (width - qrSize) / 2;
        const qrY = bottomY + 25;
        
        ctx.fillStyle = theme === 'ivory' ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        
        // Inside details of mock QR code
        ctx.fillStyle = theme === 'ivory' ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(qrX + 4, qrY + 4, qrSize - 8, qrSize - 8);

        // Mini square patterns
        ctx.fillStyle = theme === 'ivory' ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(qrX + 8, qrY + 8, 24, 24);
        ctx.fillRect(qrX + qrSize - 32, qrY + 8, 24, 24);
        ctx.fillRect(qrX + 8, qrY + qrSize - 32, 24, 24);
        
        // Random dots in center
        ctx.fillRect(qrX + 38, qrY + 38, 14, 14);
        ctx.fillRect(qrX + 58, qrY + 48, 10, 10);
        ctx.fillRect(qrX + 48, qrY + 68, 16, 12);
        ctx.fillRect(qrX + 16, qrY + 44, 10, 16);

        // Frame around QR
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      }

      // Convert canvas to dynamic downloadable blob file URL
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsDownloading(false);
          return;
        }
        const fileUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `pulsewire_share_${article.slug}_${aspect.replace(':', '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(fileUrl);
        setIsDownloading(false);
      }, 'image/png', 0.92);
    };

    // Trigger image loading with crossOrigin configurations
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = article.featuredImage;

    img.onload = () => {
      drawContent(true, img);
    };

    img.onerror = () => {
      console.warn('Canvas image loading triggered CORS or reference error, utilizing fallback drawing logic');
      drawContent(false);
    };
  };

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-md flex flex-col" id="social-share-generator">
      {/* Header Tabs */}
      <div className="bg-slate-50 dark:bg-slate-900/60 px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/10 animate-pulse" />
            Viral Share Card Engine
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
            Generate stunning high-res graphics customized for WhatsApp Status, X, IG, and Facebook
          </p>
        </div>

        {/* Dynamic Aspect Ratio toggles */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 self-start sm:self-center">
          <button
            onClick={() => setAspect('1:1')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
              aspect === '1:1'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Grid className="h-3 w-3" />
            Square Feed
          </button>
          <button
            onClick={() => setAspect('9:16')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
              aspect === '9:16'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Smartphone className="h-3 w-3" />
            Story / Status
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Customize & Preview */}
        <div className="lg:col-span-7 space-y-5">
          {/* Design Theme selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest font-mono">
              Visual Persona Presets
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { id: 'emerald', name: 'Emerald Slate', bg: 'bg-emerald-950/20 text-emerald-700 border-emerald-500' },
                { id: 'sahara', name: 'Sahara Dust', bg: 'bg-amber-950/20 text-amber-600 border-amber-500' },
                { id: 'pitch', name: 'Deep Magenta', bg: 'bg-pink-950/20 text-pink-600 border-pink-500' },
                { id: 'ivory', name: 'Warm Editorial', bg: 'bg-amber-50 text-red-600 border-red-500' }
              ].map((themePreset) => (
                <button
                  key={themePreset.id}
                  onClick={() => setTheme(themePreset.id as DesignTheme)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center gap-1 justify-center cursor-pointer ${
                    theme === themePreset.id
                      ? `${themePreset.bg} ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-950`
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full shadow-inner ${
                    themePreset.id === 'emerald' ? 'bg-gradient-to-br from-slate-950 to-emerald-900' :
                    themePreset.id === 'sahara' ? 'bg-gradient-to-br from-black to-amber-950' :
                    themePreset.id === 'pitch' ? 'bg-gradient-to-br from-gray-950 to-pink-900' :
                    'bg-gradient-to-br from-orange-50 to-red-100'
                  }`} />
                  {themePreset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Caption text customization */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest font-mono flex items-center justify-between">
              <span>Viral Text Excerpt</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-sans">Highly Readable</span>
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/35 text-slate-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none focus:border-emerald-500 transition-all font-sans leading-relaxed resize-none"
              placeholder="Add an engaging callout summary for the social sharing card"
              maxLength={150}
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Supports auto word-wrap</span>
              <span>{customText.length}/150 chars</span>
            </div>
          </div>

          {/* Actions grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            {/* Download Action */}
            <button
              onClick={generateAndDownloadCanvas}
              disabled={isDownloading}
              className="sm:col-span-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 disabled:cursor-wait text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-700/15 cursor-pointer"
            >
              {isDownloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? 'Building...' : 'Get Image'}
            </button>

            {/* Copy Package Caption */}
            <button
              onClick={handleCopyCaption}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 border border-transparent text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              {copiedCaption ? <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copiedCaption ? 'Caption Copied' : 'Get Captions'}
            </button>

            {/* Copy Article Link */}
            <button
              onClick={handleCopyLinkOnly}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              {copiedLink ? 'Link Copied' : 'Copy URL'}
            </button>
          </div>
        </div>

        {/* Right Side: Visual Live Dynamic Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest font-mono mb-2 self-start">
            Live Responsive Preview (Card Layout)
          </label>

          {/* Card Container simulating responsive dimensions */}
          <div 
            className={`w-full max-w-[280px] rounded-xl overflow-hidden shadow-2xl border transition-all duration-300 flex flex-col relative shrink-0 ${
              aspect === '1:1' ? 'aspect-square' : 'aspect-[9/16]'
            } ${
              theme === 'emerald' ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white border-emerald-900/30' :
              theme === 'sahara' ? 'bg-gradient-to-br from-orange-950 via-neutral-950 to-amber-950 text-white border-amber-900/30' :
              theme === 'pitch' ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-pink-950 text-white border-pink-900/30' :
              'bg-gradient-to-br from-amber-50/70 to-orange-50/90 text-slate-900 border-amber-200/50'
            }`}
          >
            {aspect === '1:1' ? (
              // --- SQUARE 1:1 JSX PREVIEW ---
              <>
                <div className="h-1/2 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img 
                    src={article.featuredImage} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Category Pill overlay */}
                  <div className="absolute top-3 left-3 flex gap-1.5 items-center">
                    <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest font-mono">
                      {article.category}
                    </span>
                  </div>
                </div>
                {/* Accent stripe */}
                <div className={`h-1 w-full ${
                  theme === 'emerald' ? 'bg-emerald-500' :
                  theme === 'sahara' ? 'bg-amber-500' :
                  theme === 'pitch' ? 'bg-pink-500' : 'bg-red-600'
                }`} />

                {/* Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-extrabold line-clamp-2 leading-snug font-serif">
                      {article.title}
                    </h4>
                    <p className={`text-[9px] line-clamp-2 leading-relaxed ${
                      theme === 'ivory' ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {customText}
                    </p>
                  </div>

                  {/* Brand signature */}
                  <div className="flex items-center justify-between border-t border-slate-200/10 dark:border-white/5 pt-1.5 mt-2">
                    <span className="text-[9px] font-black uppercase tracking-tight">
                      PULSE<span className="text-red-600">WIRE</span><span className={`font-normal ${theme === 'ivory' ? 'text-slate-500' : 'text-slate-400'} ml-0.5`}>AFRICA</span>
                    </span>
                    <span className={`text-[8px] font-mono font-bold ${
                      theme === 'emerald' ? 'text-emerald-500' :
                      theme === 'sahara' ? 'text-amber-500' :
                      theme === 'pitch' ? 'text-pink-500' : 'text-red-600'
                    }`}>
                      pulsewire.africa
                    </span>
                  </div>
                </div>
              </>
            ) : (
              // --- STORY 9:16 JSX PREVIEW ---
              <div className="p-4 flex-1 flex flex-col justify-between">
                {/* Brand signature top */}
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    PULSE<span className="text-red-600">WIRE</span> AFRICA
                  </span>
                  <span className={`text-[7px] font-bold font-mono tracking-widest uppercase block ${
                    theme === 'ivory' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    EDITORIAL STORY CARD
                  </span>
                </div>

                {/* Centered Image Frame */}
                <div className="my-3 w-full h-[140px] rounded-lg overflow-hidden relative shadow-md border border-slate-200/10">
                  <img 
                    src={article.featuredImage} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${
                    theme === 'emerald' ? 'bg-emerald-500' :
                    theme === 'sahara' ? 'bg-amber-500' :
                    theme === 'pitch' ? 'bg-pink-500' : 'bg-red-600'
                  }`} />
                </div>

                {/* Main Content */}
                <div className="text-center space-y-2 flex-1 flex flex-col justify-center">
                  <span className={`inline-block mx-auto text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded-full font-mono ${
                    theme === 'emerald' ? 'bg-emerald-900/40 text-emerald-400' :
                    theme === 'sahara' ? 'bg-amber-950/40 text-amber-400' :
                    theme === 'pitch' ? 'bg-pink-950/40 text-pink-400' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {article.category}
                  </span>
                  <h4 className="text-[12px] font-black leading-snug font-serif line-clamp-3">
                    {article.title}
                  </h4>
                  <p className={`text-[9px] line-clamp-3 leading-relaxed max-w-[90%] mx-auto ${
                    theme === 'ivory' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {customText}
                  </p>
                </div>

                {/* Scan instruction/Action bottom */}
                <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-slate-200/10 dark:border-white/5">
                  <span className={`text-[8px] font-medium ${theme === 'ivory' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Scan QR or Swipe Up to read story
                  </span>
                  {/* Simulated QR Code block */}
                  <div className={`w-10 h-10 p-1 rounded bg-white border flex items-center justify-center shadow-inner ${
                    theme === 'emerald' ? 'border-emerald-500/20' :
                    theme === 'sahara' ? 'border-amber-500/20' :
                    theme === 'pitch' ? 'border-pink-500/20' : 'border-red-200'
                  }`}>
                    {/* Abstract QR grid simulation */}
                    <div className="w-full h-full grid grid-cols-4 gap-0.5 opacity-80">
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-white"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-white"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-white"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-white"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-white"></div>
                      <div className="bg-slate-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 text-center max-w-[200px] leading-tight font-mono uppercase">
            Downloads high-res PNG image correctly formatted for native feeds
          </span>
        </div>
      </div>

      {/* Hidden processing canvas used exclusively for background rendering to prevent flickering */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
