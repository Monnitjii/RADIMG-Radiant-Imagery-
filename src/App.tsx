/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Download, 
  Undo2, 
  Redo2,
  Settings2, 
  Grid3X3, 
  Cpu, 
  Type, 
  Layers, 
  Wind, 
  Zap, 
  ChevronLeft,
  Share2,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  Palette,
  Maximize,
  Binary
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { cn } from './lib/utils';

// --- Types ---

interface FilterConfig {
  type: FilterType;
  params: Record<string, any>;
}

interface Effect {
  id: FilterType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

// --- Constants ---

const EFFECTS: Effect[] = [
  { id: 'halftone', name: 'Halftone Engine', description: 'Vintage newspaper & pop art dots', icon: <Grid3X3 className="w-6 h-6" /> },
  { id: 'glitch', name: 'Glitch Studio', description: 'Digital corruption & datamosh', icon: <Zap className="w-6 h-6" /> },
  { id: 'ascii', name: 'ASCII Art', description: 'Terminal aesthetics & text art', icon: <Type className="w-6 h-6" /> },
  { id: 'dither', name: 'Pixel Dither', description: 'Retro computing & 1-bit textures', icon: <Layers className="w-6 h-6" /> },
  { id: 'glass', name: 'Glass Refraction', description: 'Textured glass & light distortion', icon: <Cpu className="w-6 h-6" /> },
  { id: 'blur', name: 'Motion Blur', description: 'Directional speed & dynamism', icon: <Wind className="w-6 h-6" /> },
  { id: 'trace', name: 'Artkit Trace', description: 'Particle flow & geometric tracing', icon: <ImageIcon className="w-6 h-6" /> },
  { id: 'vision', name: 'Computer Vision', description: 'Bounding boxes & analysis overlays', icon: <Maximize className="w-6 h-6" /> },
  { id: 'bitcrush', name: 'Bit Crusher', description: '8-bit retro quantization & posterization', icon: <Binary className="w-6 h-6" /> },
  { id: 'doubleExposure', name: 'Double Exposure', description: 'Urban glitch & ghost layering', icon: <Layers className="w-6 h-6" /> },
];

// --- Components ---

function ThumbnailPreview({ image, effect }: { image: string, effect: FilterType }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 300; // Small size for thumbnail
      canvas.width = size;
      canvas.height = size;

      // Calculate cover fit
      const ratio = Math.max(size / img.width, size / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (size - w) / 2;
      const y = (size - h) / 2;

      // Create a temporary canvas for the cropped image
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = size;
      cropCanvas.height = size;
      const cropCtx = cropCanvas.getContext('2d')!;
      cropCtx.drawImage(img, x, y, w, h);
      
      const croppedImg = new Image();
      croppedImg.src = cropCanvas.toDataURL();
      croppedImg.onload = () => {
        const defaults: Record<FilterType, any> = {
          halftone: { size: 10, contrast: 1.5, angle: 45, showBackground: true },
          glitch: { intensity: 0.5, complexity: 0.3, amount: 0.5, seed: 0, showBackground: true },
          ascii: { fontSize: 8, transparency: 1.0, colorize: false, asciiStrength: 1.0, showBackground: true },
          dither: { intensity: 0.5, complexity: 0.5, amount: 1.0, seed: 0, showBackground: true },
          glass: { distortion: 0.4, refraction: 1.3, blur: 0.2, showBackground: true },
          blur: { length: 20, angle: 0, showBackground: true },
          trace: { sensitivity: 0.5, density: 0.4, showBackground: false },
          vision: { boxes: 10, boxSize: 1.0, transparency: 1.0, shape: 'rectangle', seed: 0, showBackground: true },
          bitcrush: { blockSize: 4, banding: 1.0, dither: 0.5, showBackground: true },
          doubleExposure: { exposure: 1.5, blur: 15, ghosting: 0.4, blend: 0.6, showBackground: true },
        };

        FilterService.applyFilter(ctx, size, size, effect, defaults[effect], croppedImg);
        setIsLoaded(true);
      };
    };
  }, [image, effect]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <canvas 
        ref={canvasRef} 
        className={cn(
          "w-full h-full object-cover transition-opacity duration-700",
          isLoaded ? "opacity-60" : "opacity-0"
        )}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
          <ImageIcon className="w-8 h-8 text-white/10" />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [activeEffect, setActiveEffect] = useState<FilterType | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<{ effect: FilterType, params: Record<string, any> }[]>([]);
  const [redoStack, setRedoStack] = useState<{ effect: FilterType, params: Record<string, any> }[]>([]);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setProcessedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.avif'],
      'image/avif': ['.avif']
    },
    multiple: false,
    noClick: !!image 
  } as any);

  const handleReset = () => {
    setImage(null);
    setProcessedImage(null);
    setActiveEffect(null);
    setParams({});
    setHistory([]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length > 0 && activeEffect) {
      const previous = history[history.length - 1];
      setRedoStack(prev => [...prev, { effect: activeEffect, params }]);
      setParams(previous.params);
      setActiveEffect(previous.effect);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0 && activeEffect) {
      const next = redoStack[redoStack.length - 1];
      setHistory(prev => [...prev, { effect: activeEffect, params }]);
      setParams(next.params);
      setActiveEffect(next.effect);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const addToHistory = useCallback((effect: FilterType, stateToSave: Record<string, any>) => {
    setHistory(prev => {
      // Limit history to 50 entries
      const next = [...prev, { effect, params: stateToSave }];
      if (next.length > 50) return next.slice(1);
      return next;
    });
    setRedoStack([]);
  }, []);

  const handleProcessed = useCallback((dataUrl: string) => {
    setProcessedImage(dataUrl);
  }, []);

  // Initialize default params when effect changes
  useEffect(() => {
    if (activeEffect && Object.keys(params).length === 0) {
      const defaults: Record<FilterType, any> = {
        halftone: { size: 10, contrast: 1.5, angle: 45, showBackground: true },
        glitch: { intensity: 0.5, complexity: 0.3, amount: 0.5, seed: 0, showBackground: true },
        ascii: { fontSize: 8, transparency: 1.0, colorize: false, asciiStrength: 1.0, showBackground: true },
        dither: { intensity: 0.5, complexity: 0.5, amount: 1.0, seed: 0, showBackground: true },
        glass: { distortion: 0.4, refraction: 1.3, blur: 0.2, showBackground: true },
        blur: { length: 20, angle: 0, showBackground: true },
        trace: { sensitivity: 0.5, density: 0.4, showBackground: false },
        vision: { boxes: 10, boxSize: 1.0, transparency: 1.0, shape: 'rectangle', seed: 0, showBackground: true },
        bitcrush: { blockSize: 4, banding: 1.0, dither: 0.5, showBackground: true },
        doubleExposure: { exposure: 1.5, blur: 15, ghosting: 0.4, blend: 0.6, showBackground: true },
      };
      setParams(defaults[activeEffect]);
    }
  }, [activeEffect]);

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-white/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/5 bg-[#030303]/80 backdrop-blur-xl flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {activeEffect && (
            <button 
              onClick={() => {
                setActiveEffect(null);
                setParams({});
                setHistory([]);
                setRedoStack([]);
              }}
              className="p-2 hover:bg-white/10 rounded-none transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-white">
            {activeEffect ? EFFECTS.find(e => e.id === activeEffect)?.name : 'RadIMG'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {image && (
            <>
              <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2 hover:bg-white/5 rounded-none transition-colors disabled:opacity-30"
                title="Undo"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 hover:bg-white/5 rounded-none transition-colors disabled:opacity-30"
                title="Redo"
              >
                <Redo2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsExporting(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-none transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="pt-16 h-[calc(100vh-4rem)] relative overflow-hidden">
        {!image ? (
          <div {...getRootProps()} className="h-full flex flex-col items-center justify-center p-6">
            <input {...getInputProps()} />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "max-w-md w-full aspect-square border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-500",
                isDragActive ? "border-red-600 bg-red-600/10 scale-105" : "bg-white/5 hover:bg-white/10 hover:border-white/40"
              )}
            >
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex items-center justify-center mb-2">
                <Upload className="w-8 h-8 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-medium text-white">Drop your photo here</p>
                <p className="text-zinc-500 mt-1">or click to browse your gallery</p>
              </div>
              <button className="mt-4 px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 transition-colors">
                Select Image
              </button>
            </motion.div>
            
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full opacity-50 grayscale pointer-events-none">
              {EFFECTS.slice(0, 4).map(effect => (
                <div key={effect.id} className="p-4 rounded-none bg-white/5 border border-white/5 flex flex-col items-center gap-2">
                  {effect.icon}
                  <span className="text-xs font-medium">{effect.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : !activeEffect ? (
          <div className="h-full overflow-y-auto p-6 pb-24">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Effect Gallery</h2>
                  <p className="text-zinc-500">Choose a tool to begin forging your art</p>
                </div>
                <button 
                  onClick={handleReset}
                  className="text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Change Image
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {EFFECTS.map((effect, index) => (
                  <motion.button
                    key={effect.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setParams({});
                      setHistory([]);
                      setActiveEffect(effect.id);
                    }}
                    className="group relative aspect-[4/5] rounded-none bg-white/5 border border-white/5 overflow-hidden hover:bg-white/10 transition-all hover:border-red-600/50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <ThumbnailPreview image={image} effect={effect.id} />
                    <div className="absolute inset-0 z-20 p-6 flex flex-col justify-end items-start text-left">
                      <div className="w-10 h-10 rounded-none bg-black/50 backdrop-blur-md flex items-center justify-center mb-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        {effect.icon}
                      </div>
                      <h3 className="text-lg font-bold mb-1 text-white">{effect.name}</h3>
                      <p className="text-sm text-zinc-400 line-clamp-2">{effect.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Workspace 
            image={image} 
            effect={activeEffect} 
            params={params}
            setParams={(newParams) => {
              addToHistory(activeEffect, params);
              setParams(newParams);
            }}
            onProcessed={handleProcessed}
            onClose={() => {
              setActiveEffect(null);
              setParams({});
            }} 
          />
        )}
      </main>

      <AnimatePresence>
        {isExporting && (
          <ExportModal 
            originalImage={image!}
            effect={activeEffect}
            params={params}
            onClose={() => setIsExporting(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { FilterService, FilterType } from './services/filterService';

// --- Workspace Component ---

function Workspace({ 
  image, 
  effect, 
  params, 
  setParams, 
  onProcessed, 
  onClose 
}: { 
  image: string, 
  effect: FilterType, 
  params: Record<string, any>,
  setParams: (p: any) => void,
  onProcessed: (url: string) => void,
  onClose: () => void 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load original image once
  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => {
      originalImageRef.current = img;
      render();
    };
  }, [image]);

  const render = useCallback(() => {
    if (!canvasRef.current || !originalImageRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = originalImageRef.current;
    const container = containerRef.current;
    if (!ctx) return;

    setIsProcessing(true);

    // Calculate dimensions
    const maxWidth = container.clientWidth - 48;
    const maxHeight = container.clientHeight - 48;
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
    
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;

    // Use a small timeout to allow UI to show processing state
    requestAnimationFrame(() => {
      FilterService.applyFilter(ctx, canvas.width, canvas.height, effect, params, img);
      onProcessed(canvas.toDataURL('image/png'));
      setIsProcessing(false);
    });
  }, [effect, params, onProcessed]);

  useEffect(() => {
    render();
  }, [render]);

  const handleRandomize = () => {
    const newParams = { ...params };
    Object.keys(newParams).forEach(key => {
      if (key === 'seed') {
        newParams[key] = Math.random() * 1000;
        return;
      }
      if (typeof newParams[key] === 'number') {
        const max = key === 'angle' ? 360 : 
                    ['size', 'length', 'fontSize'].includes(key) ? 50 : 
                    ['contrast', 'refraction'].includes(key) ? 3 :
                    ['asciiStrength', 'transparency', 'intensity', 'complexity', 'amount', 'distortion', 'blur', 'sensitivity', 'density'].includes(key) ? 1 : 
                    2;
        newParams[key] = Math.random() * max;
      } else if (typeof newParams[key] === 'boolean') {
        newParams[key] = Math.random() > 0.5;
      }
    });
    setParams(newParams);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Preview Area */}
      <div ref={containerRef} className="flex-1 bg-black/20 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="relative group">
          <canvas 
            ref={canvasRef} 
            className="rounded-none shadow-2xl shadow-black/50 max-w-full max-h-full transition-opacity duration-300"
            style={{ opacity: isProcessing ? 0.7 : 1 }}
          />
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-none animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-zinc-900/50 backdrop-blur-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold flex items-center gap-2 text-white">
            <Settings2 className="w-4 h-4 text-zinc-400" />
            Parameters
          </h3>
          <button 
            onClick={() => {
              const defaults: Record<FilterType, any> = {
                halftone: { size: 10, contrast: 1.5, angle: 45, showBackground: true },
                glitch: { intensity: 0.5, complexity: 0.3, amount: 0.5, seed: 0, showBackground: true },
                ascii: { fontSize: 8, transparency: 1.0, colorize: false, asciiStrength: 1.0, showBackground: true },
                dither: { intensity: 0.5, complexity: 0.5, amount: 1.0, seed: 0, showBackground: true },
                glass: { distortion: 0.4, refraction: 1.3, blur: 0.2, showBackground: true },
                blur: { length: 20, angle: 0, showBackground: true },
                trace: { sensitivity: 0.5, density: 0.4, showBackground: false },
                vision: { boxes: 10, boxSize: 1.0, transparency: 1.0, shape: 'rectangle', seed: 0, showBackground: true },
                bitcrush: { blockSize: 4, banding: 1.0, dither: 0.5, showBackground: true },
                doubleExposure: { exposure: 1.5, blur: 15, ghosting: 0.4, blend: 0.6, showBackground: true },
              };
              setParams(defaults[effect]);
            }}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="space-y-8">
          {Object.entries(params)
            .filter(([key]) => {
              if (key === 'showBackground') return false;
              if (effect === 'ascii' && key === 'colorize') return false;
              if (effect === 'glitch' && key === 'seed') return false;
              if (effect === 'vision' && key === 'seed') return false;
              // Keep all sliders for dither as requested
              return true;
            })
            .map(([key, value]) => (
            <div key={key} className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="capitalize text-zinc-400">{key.replace(/([A-Z])/g, ' $1')}</label>
                <span className="font-mono text-white">
                  {typeof value === 'number' ? value.toFixed(2) : String(value as any)}
                </span>
              </div>
              {typeof value === 'number' ? (
                <input 
                  type="range" 
                  min={key === 'fontSize' ? 4 : 0} 
                  max={
                    key === 'angle' ? 360 : 
                    ['size', 'length', 'fontSize', 'boxes', 'blockSize'].includes(key) ? 50 : 
                    key === 'boxSize' ? 3 :
                    key === 'seed' ? 1000 :
                    key === 'exposure' ? 3 :
                    ['contrast', 'refraction'].includes(key) ? 3 :
                    ['asciiStrength', 'transparency', 'intensity', 'complexity', 'amount', 'distortion', 'blur', 'sensitivity', 'density', 'banding', 'dither', 'ghosting', 'blend'].includes(key) ? 1 : 
                    2
                  } 
                  step={key === 'blockSize' ? 1 : 0.01}
                  value={value}
                  onChange={(e) => setParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-white/20 rounded-none appearance-none cursor-pointer accent-red-600"
                />
              ) : typeof value === 'boolean' ? (
                <button 
                  onClick={() => setParams(prev => ({ ...prev, [key]: !value }))}
                  className={cn(
                    "w-full py-2 rounded-none border transition-all text-sm font-medium",
                    value ? "bg-red-600 text-white border-red-600" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                  )}
                >
                  {value ? 'Enabled' : 'Disabled'}
                </button>
              ) : (
                <div className="p-1 bg-white/5 rounded-none border border-white/10 flex gap-1">
                  {['floyd-steinberg', 'ordered', 'atkinson'].includes(value as any) ? (
                    ['floyd-steinberg', 'ordered', 'atkinson'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setParams(prev => ({ ...prev, [key]: opt }))}
                        className={cn(
                          "flex-1 py-1.5 rounded-none text-[10px] uppercase font-bold transition-all",
                          value === opt ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {opt.split('-')[0]}
                      </button>
                    ))
                  ) : ['rectangle', 'rounded', 'circle'].includes(value as any) ? (
                    ['rectangle', 'rounded', 'circle'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setParams(prev => ({ ...prev, [key]: opt }))}
                        className={cn(
                          "flex-1 py-1.5 rounded-none text-[10px] uppercase font-bold transition-all",
                          value === opt ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {opt}
                      </button>
                    ))
                  ) : (
                    <select 
                      value={value as any}
                      onChange={(e) => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none"
                    >
                      <option value={value as any}>{value as any}</option>
                    </select>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3">
          <button 
            onClick={() => setParams(prev => ({ ...prev, showBackground: !prev.showBackground }))}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-none border transition-all text-sm font-medium",
              params.showBackground ? "bg-red-600 text-white border-red-600" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
            )}
          >
            {params.showBackground ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Background
          </button>

          {effect === 'ascii' ? (
            <button 
              onClick={() => setParams(prev => ({ ...prev, colorize: !prev.colorize }))}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-none border transition-all text-sm font-medium",
                params.colorize ? "bg-red-600 text-white border-red-600" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
              )}
            >
              <Palette className="w-4 h-4" />
              Colorize
            </button>
          ) : effect === 'glitch' || effect === 'vision' ? (
            <button 
              onClick={() => setParams(prev => ({ ...prev, seed: Math.random() * 1000 }))}
              className="flex items-center justify-center gap-2 py-3 rounded-none bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              Randomize
            </button>
          ) : (
            <button 
              onClick={handleRandomize}
              className="flex items-center justify-center gap-2 py-3 rounded-none bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              Randomize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Export Modal ---

function ExportModal({ originalImage, effect, params, onClose }: { 
  originalImage: string, 
  effect: FilterType | null,
  params: Record<string, any>,
  onClose: () => void 
}) {
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [resolution, setResolution] = useState('1080p');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownload = async () => {
    setIsProcessing(true);
    
    // Give UI a chance to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const link = document.createElement('a');
    link.download = `radimg-export.${format}`;
    
    const canvas = document.createElement('canvas');
    const img = new Image();
    
    img.onload = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (resolution === '4k') {
        targetWidth = 3840;
        targetHeight = 2160;
      } else if (resolution === '1080p') {
        targetWidth = 1920;
        targetHeight = 1080;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        if (effect) {
          // Re-apply filter at high resolution
          FilterService.applyFilter(ctx, targetWidth, targetHeight, effect, params, img);
        } else {
          // Just draw original image at target resolution
          if (format === 'jpg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }
        
        let mimeType = 'image/png';
        if (format === 'jpg') mimeType = 'image/jpeg';
        if (format === 'avif') mimeType = 'image/avif';
        if (format === 'tiff') mimeType = 'image/tiff';

        try {
          link.href = canvas.toDataURL(mimeType, (format === 'jpg' || format === 'avif') ? quality / 100 : undefined);
          link.click();
        } catch (e) {
          console.error("Export failed:", e);
        }
      }
      setIsProcessing(false);
    };
    
    img.onerror = () => {
      setIsProcessing(false);
      console.error("Failed to load image for export");
    };
    
    img.src = originalImage;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-none w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-8 border-b border-white/5">
          <h2 className="text-2xl font-bold">Export Artwork</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400">File Format</label>
              <div className="grid grid-cols-4 gap-2">
                {['png', 'jpg', 'tiff', 'avif'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "py-2 rounded-none border text-sm font-bold uppercase transition-all",
                      format === f ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {(format === 'jpg' || format === 'avif') && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <label className="text-zinc-400">Quality</label>
                  <span className="text-white font-mono">{quality}%</span>
                </div>
                <input 
                  type="range" 
                  min={10} 
                  max={100} 
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-none appearance-none cursor-pointer accent-red-600"
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1080p', label: '1080p', size: '1920 × 1080' },
                  { id: '4k', label: '4K Ultra HD', size: '3840 × 2160' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setResolution(r.id)}
                    className={cn(
                      "p-3 rounded-none border text-left transition-all",
                      resolution === r.id ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    <div className="text-sm font-bold uppercase">{r.label}</div>
                    <div className={cn("text-[10px] font-mono", resolution === r.id ? "text-white/70" : "text-zinc-500")}>
                      {r.size}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleDownload}
              disabled={isProcessing}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-3 rounded-none transition-all group",
                isProcessing ? "bg-zinc-800 cursor-wait" : "bg-red-600 hover:bg-red-500 text-white"
              )}
            >
              {isProcessing ? (
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-none animate-spin" />
              ) : (
                <Download className="w-8 h-8 group-hover:scale-110 transition-transform" />
              )}
              <span className="font-bold">{isProcessing ? 'Processing...' : 'Save to Device'}</span>
            </button>
          </div>
        </div>

        <div className="p-8 bg-black/20 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-500">
            By exporting, you agree to the RadIMG terms of service. 
            All processing is done locally on your device.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
