import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCw, 
  ZoomIn, 
  Maximize, 
  Sliders, 
  Image as ImageIcon, 
  Check, 
  RefreshCw,
  Sparkles,
  LayoutGrid
} from 'lucide-react';

interface ImageEditorOverlayProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (editedImageSrc: string) => void;
  title?: string;
}

const FILTER_PRESETS = [
  { id: 'none', name: 'Original', filterString: 'none' },
  { id: 'noir', name: 'Noir (Grayscale)', filterString: 'grayscale(1) contrast(1.2) brightness(0.95)' },
  { id: 'editorial', name: 'Warm Editorial', filterString: 'sepia(0.35) contrast(1.1) brightness(1.02) saturate(0.9)' },
  { id: 'vivid', name: 'Vivid Tech', filterString: 'saturate(1.4) contrast(1.15) brightness(1.05)' },
  { id: 'vintage', name: 'Muted Vintage', filterString: 'sepia(0.2) saturate(0.7) brightness(0.95) contrast(0.9)' },
  { id: 'cool', name: 'Cool Accent', filterString: 'hue-rotate(20deg) saturate(1.1) contrast(1.05)' }
];

export default function ImageEditorOverlay({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  title = "Adjust Cover Photo Framing & Filters"
}: ImageEditorOverlayProps) {
  const [activeTab, setActiveTab] = useState<'crop' | 'filters'>('crop');
  
  // Crop & Framing State
  const [aspectRatio, setAspectRatio] = useState<string>('16:9'); // '16:9' | '4:3' | '1:1' | 'free'
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0); // degrees
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);

  // Filter Adjustments State
  const [selectedPreset, setSelectedPreset] = useState<string>('none');
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150
  const [contrast, setContrast] = useState<number>(100); // 50 to 150
  const [saturation, setSaturation] = useState<number>(100); // 0 to 200
  const [grayscale, setGrayscale] = useState<number>(0); // 0 to 100
  const [sepia, setSepia] = useState<number>(0); // 0 to 100
  const [blur, setBlur] = useState<number>(0); // 0 to 10

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image on mount/change
  useEffect(() => {
    if (!imageSrc) return;
    
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Reset variables on new image
      setZoom(1.0);
      setRotation(0);
      setTranslateX(0);
      setTranslateY(0);
      setSelectedPreset('none');
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setGrayscale(0);
      setSepia(0);
      setBlur(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle preset selection
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    
    // Set custom slider values to match presets
    switch(presetId) {
      case 'none':
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setGrayscale(0);
        setSepia(0);
        setBlur(0);
        break;
      case 'noir':
        setBrightness(95);
        setContrast(120);
        setSaturation(0);
        setGrayscale(100);
        setSepia(0);
        setBlur(0);
        break;
      case 'editorial':
        setBrightness(102);
        setContrast(110);
        setSaturation(90);
        setGrayscale(0);
        setSepia(35);
        setBlur(0);
        break;
      case 'vivid':
        setBrightness(105);
        setContrast(115);
        setSaturation(140);
        setGrayscale(0);
        setSepia(0);
        setBlur(0);
        break;
      case 'vintage':
        setBrightness(95);
        setContrast(90);
        setSaturation(70);
        setGrayscale(0);
        setSepia(20);
        setBlur(0);
        break;
      case 'cool':
        setBrightness(105);
        setContrast(105);
        setSaturation(110);
        setGrayscale(0);
        setSepia(0);
        setBlur(0);
        break;
    }
  };

  // Redraw preview canvas
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;

    // Define target canvas resolution based on aspect ratio
    let targetWidth = 1200;
    let targetHeight = 675; // Default 16:9

    if (aspectRatio === '4:3') {
      targetHeight = 900;
    } else if (aspectRatio === '1:1') {
      targetHeight = 1200;
    } else if (aspectRatio === 'free') {
      // Keep original image ratio
      const origRatio = img.width / img.height;
      targetHeight = Math.round(targetWidth / origRatio);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear background
    ctx.fillStyle = '#0f172a'; // Deep slate background
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.save();

    // 1. Position and center
    ctx.translate(targetWidth / 2, targetHeight / 2);

    // 2. Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Zoom
    ctx.scale(zoom, zoom);

    // 4. Translate based on user positioning
    ctx.translate(translateX, translateY);

    // 5. Apply HTML5 canvas filters if supported
    const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`;
    ctx.filter = filterStr;

    // 6. Draw image centered
    // Calculate sizing to cover the viewport nicely as "cover" fit initially
    const targetRatio = targetWidth / targetHeight;
    const imageRatio = img.width / img.height;

    let drawWidth = targetWidth;
    let drawHeight = targetHeight;

    if (imageRatio > targetRatio) {
      // Image is wider than target aspect ratio
      drawWidth = targetHeight * imageRatio;
    } else {
      // Image is taller than target aspect ratio
      drawHeight = targetWidth / imageRatio;
    }

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  }, [
    imageLoaded,
    aspectRatio,
    zoom,
    rotation,
    translateX,
    translateY,
    brightness,
    contrast,
    saturation,
    grayscale,
    sepia,
    blur
  ]);

  // Handle Save
  const handleSave = () => {
    if (!previewCanvasRef.current) return;
    const croppedDataUrl = previewCanvasRef.current.toDataURL('image/jpeg', 0.9);
    onSave(croppedDataUrl);
  };

  const resetAll = () => {
    setZoom(1.0);
    setRotation(0);
    setTranslateX(0);
    setTranslateY(0);
    setSelectedPreset('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGrayscale(0);
    setSepia(0);
    setBlur(0);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="image-editor-overlay-container"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div 
        id="image-editor-modal"
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[95vh] md:max-h-[90vh]"
      >
        
        {/* Left/Top Panel: Canvas Viewport */}
        <div 
          id="editor-preview-panel"
          className="flex-1 bg-slate-950 p-6 flex flex-col justify-center items-center border-r border-slate-200 dark:border-slate-800 relative select-none"
          ref={containerRef}
        >
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="text-[10px] bg-slate-900/80 text-white font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-800">
              Aspect Ratio: {aspectRatio}
            </span>
            <span className="text-[10px] bg-slate-900/80 text-white font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-800">
              Zoom: {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Actual Canvas */}
          <div className="relative w-full max-w-full aspect-[16/10] flex items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-inner">
            {!imageLoaded ? (
              <div className="text-center text-slate-500 font-medium">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Loading original image...</span>
              </div>
            ) : (
              <canvas
                id="image-crop-preview-canvas"
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain shadow-2xl rounded"
                style={{
                  filter: `drop-shadow(0 10px 15px rgba(0,0,0,0.5))`
                }}
              />
            )}
          </div>

          <p className="text-slate-400 text-[10px] text-center mt-3 font-medium font-sans">
            Use the control panel sliders on the right to position, scale, rotate, and filter.
          </p>
        </div>

        {/* Right/Bottom Panel: Controls & Options */}
        <div 
          id="editor-controls-panel"
          className="w-full md:w-[380px] flex flex-col bg-white dark:bg-slate-900"
        >
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                {title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Crop framing and apply editorial styles
              </p>
            </div>
            <button
              id="close-image-editor"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
            <button
              id="tab-crop-framing"
              onClick={() => setActiveTab('crop')}
              className={`flex-1 py-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition-all ${activeTab === 'crop' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100/50'}`}
            >
              <Maximize className="h-3.5 w-3.5" />
              Framing & Zoom
            </button>
            <button
              id="tab-color-filters"
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition-all ${activeTab === 'filters' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100/50'}`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Editorial Filters
            </button>
          </div>

          {/* Tab Contents Scrollable container */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 max-h-[50vh] md:max-h-[calc(90vh-180px)]">
            {activeTab === 'crop' ? (
              <div id="crop-controls" className="space-y-5">
                
                {/* Aspect Ratio Presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                    <LayoutGrid className="h-3 w-3 text-emerald-600" />
                    Target Aspect Ratio
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: '16:9', label: '16:9' },
                      { id: '4:3', label: '4:3' },
                      { id: '1:1', label: '1:1 Square' },
                      { id: 'free', label: 'Free' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        id={`ratio-preset-${preset.id}`}
                        onClick={() => setAspectRatio(preset.id)}
                        className={`py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all ${aspectRatio === preset.id ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                      <ZoomIn className="h-3 w-3 text-emerald-600" />
                      Image Scale / Zoom
                    </label>
                    <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                      {zoom.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    id="zoom-slider"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={e => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Rotation Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                      <RotateCw className="h-3 w-3 text-emerald-600" />
                      Rotate Angle
                    </label>
                    <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                      {rotation}°
                    </span>
                  </div>
                  <input
                    type="range"
                    id="rotation-slider"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotation}
                    onChange={e => setRotation(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                    <span>-180°</span>
                    <button onClick={() => setRotation(0)} className="hover:text-emerald-600 font-bold underline">Center (0°)</button>
                    <span>180°</span>
                  </div>
                </div>

                {/* Position Shift X */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                      Shift Horizontal (X)
                    </label>
                    <span className="text-[10px] font-bold font-mono text-slate-500">
                      {translateX}px
                    </span>
                  </div>
                  <input
                    type="range"
                    id="shift-x-slider"
                    min="-400"
                    max="400"
                    step="2"
                    value={translateX}
                    onChange={e => setTranslateX(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Position Shift Y */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                      Shift Vertical (Y)
                    </label>
                    <span className="text-[10px] font-bold font-mono text-slate-500">
                      {translateY}px
                    </span>
                  </div>
                  <input
                    type="range"
                    id="shift-y-slider"
                    min="-400"
                    max="400"
                    step="2"
                    value={translateY}
                    onChange={e => setTranslateY(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

              </div>
            ) : (
              <div id="filter-controls" className="space-y-5">
                
                {/* Filter Presets Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    Editorial Tone Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FILTER_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        id={`filter-preset-btn-${preset.id}`}
                        onClick={() => handlePresetChange(preset.id)}
                        className={`flex items-center justify-between p-2.5 text-[10px] font-bold rounded-lg border text-left transition-all ${selectedPreset === preset.id ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                      >
                        <span>{preset.name}</span>
                        {selectedPreset === preset.id && <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 my-4 pt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-4">
                    Manual Color Corrections
                  </h4>
                  
                  {/* Brightness */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Brightness</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={e => {
                        setBrightness(parseInt(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Contrast</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={contrast}
                      onChange={e => {
                        setContrast(parseInt(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Saturation</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={e => {
                        setSaturation(parseInt(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Grayscale */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Grayscale Black & White</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600">{grayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={grayscale}
                      onChange={e => {
                        setGrayscale(parseInt(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Sepia */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Sepia Tone (Warmth)</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600">{sepia}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sepia}
                      onChange={e => {
                        setSepia(parseInt(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Atmospheric Blur</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-600">{blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={blur}
                      onChange={e => {
                        setBlur(parseFloat(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                </div>

              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center gap-3">
            <button
              id="editor-reset-btn"
              onClick={resetAll}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset All
            </button>
            <button
              id="editor-apply-btn"
              onClick={handleSave}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/10 transition-colors"
            >
              <Check className="h-4 w-4" />
              Apply & Save
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
