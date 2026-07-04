'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { lookupBarcode, BarcodeLookupResult } from '@/lib/openfoodfacts';
import { logCustomMeal } from '@/lib/meal-service';
import {
  Camera,
  CameraOff,
  Loader2,
  Plus,
  X,
  RotateCcw,
  AlertTriangle,
  Package,
  ImagePlus,
  Hash,
  Search,
} from 'lucide-react';

interface BarcodeScannerProps {
  userId: string;
  onSuccess: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  userId,
  onSuccess,
}) => {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [product, setProduct] = useState<BarcodeLookupResult | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mass, setMass] = useState('100');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [scanningImage, setScanningImage] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookingUpManual, setLookingUpManual] = useState(false);

  const scannerRef = useRef<any>(null);
  const readerDivRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Barcode formats to scan for
  const getBarcodeFormats = async () => {
    const { Html5QrcodeSupportedFormats } = await import('html5-qrcode');
    return [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR,
    ];
  };

  // Check if we're in a secure context (HTTPS or localhost)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const secure =
        window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      setIsSecureContext(secure);
    }
  }, []);

  const startScanning = useCallback(async () => {
    setCameraError(null);
    setError('');
    setNotFound(false);
    setProduct(null);
    setScannedBarcode(null);

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore — might not be running
        }
      }

      const formats = await getBarcodeFormats();
      const html5QrCode = new Html5Qrcode('barcode-reader', {
        formatsToSupport: formats,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.0,
        },
        async (decodedText: string) => {
          // Barcode scanned!
          try {
            await html5QrCode.stop();
          } catch {
            // ignore
          }
          setScanning(false);
          handleBarcodeScan(decodedText);
        },
        () => {
          // Scanning in progress — ignore intermediate scan failures
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      const msg = err?.message || '';
      if (
        msg.includes('NotAllowedError') ||
        err?.name === 'NotAllowedError'
      ) {
        setCameraError(
          'Camera access denied. Please allow camera access in your browser settings.'
        );
      } else if (
        msg.includes('NotFoundError') ||
        err?.name === 'NotFoundError'
      ) {
        setCameraError('No camera found on this device.');
      } else if (
        msg.includes('not supported') ||
        msg.includes('insecure') ||
        !isSecureContext
      ) {
        setCameraError(
          'Live camera requires HTTPS. Use the "Scan from Photo" option below instead, or access this app via HTTPS.'
        );
      } else {
        setCameraError(
          msg || 'Failed to start camera.'
        );
      }
    }
  }, [isSecureContext]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Convert File to data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Try Quagga2 — purpose-built 1D barcode decoder (most reliable)
  const tryQuaggaDecode = async (dataUrl: string): Promise<string | null> => {
    try {
      const Quagga = (await import('@ericblade/quagga2')).default;

      // Try multiple configurations for better hit rate
      const configs = [
        { patchSize: 'medium' as const, halfSample: true },
        { patchSize: 'large' as const, halfSample: false },
        { patchSize: 'small' as const, halfSample: true },
        { patchSize: 'x-large' as const, halfSample: false },
        { patchSize: 'x-small' as const, halfSample: false },
      ];

      for (const config of configs) {
        const result = await new Promise<string | null>((resolve) => {
          Quagga.decodeSingle(
            {
              src: dataUrl,
              numOfWorkers: 0, // run in main thread for reliability
              locate: true,    // try to locate the barcode in the image
              decoder: {
                readers: [
                  'ean_reader',
                  'ean_8_reader',
                  'upc_reader',
                  'upc_e_reader',
                  'code_128_reader',
                  'code_39_reader',
                  'i2of5_reader',
                  'codabar_reader',
                ],
                multiple: false,
              },
              locator: {
                patchSize: config.patchSize,
                halfSample: config.halfSample,
              },
            },
            (res: any) => {
              if (res && res.codeResult && res.codeResult.code) {
                resolve(res.codeResult.code);
              } else {
                resolve(null);
              }
            }
          );
        });

        if (result) return result;
      }

      return null;
    } catch (err) {
      console.error('Quagga decode error:', err);
      return null;
    }
  };

  // Try native BarcodeDetector API (Chrome 83+ HTTPS, Safari 17.2+ HTTPS)
  const tryNativeBarcodeDetector = async (dataUrl: string): Promise<string | null> => {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass) return null;

      const detector = new BarcodeDetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar'],
      });

      // Load image
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = dataUrl;
      });

      const barcodes = await detector.detect(img);
      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Handle file/photo selection — scan barcode from image
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningImage(true);
    setError('');
    setCameraError(null);
    setNotFound(false);

    try {
      const dataUrl = await fileToDataUrl(file);

      // Strategy 1: Quagga2 (most reliable for 1D barcodes, works on HTTP)
      const quaggaResult = await tryQuaggaDecode(dataUrl);
      if (quaggaResult) {
        handleBarcodeScan(quaggaResult);
        return;
      }

      // Strategy 2: Native BarcodeDetector (if available, needs HTTPS)
      const nativeResult = await tryNativeBarcodeDetector(dataUrl);
      if (nativeResult) {
        handleBarcodeScan(nativeResult);
        return;
      }

      // All strategies failed
      setError('Could not detect a barcode. Try entering the number manually below.');
    } catch (err: any) {
      console.error('Scan error:', err);
      setError('Could not process image. Try entering the number manually below.');
    } finally {
      setScanningImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle manual barcode entry
  const handleManualLookup = async () => {
    const code = manualBarcode.trim();
    if (!code) {
      setError('Please enter a barcode number');
      return;
    }
    setLookingUpManual(true);
    setError('');
    await handleBarcodeScan(code);
    setLookingUpManual(false);
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScannedBarcode(barcode);
    setLooking(true);
    setNotFound(false);
    setError('');

    try {
      const result = await lookupBarcode(barcode);
      if (result) {
        setProduct(result);
        setMass(result.servingSize ? String(result.servingSize) : '100');
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to look up product');
    } finally {
      setLooking(false);
    }
  };

  const handleLog = async () => {
    if (!product) return;

    const massNum = parseFloat(mass);
    if (isNaN(massNum) || massNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const ratio = massNum / 100;
    const nutrients = {
      calories: product.nutrientsPer100g.calories * ratio,
      protein: product.nutrientsPer100g.protein * ratio,
      fats: product.nutrientsPer100g.fats * ratio,
      carbohydrates: product.nutrientsPer100g.carbohydrates * ratio,
    };

    setSaving(true);
    setError('');

    try {
      const displayName = product.brands
        ? `${product.productName} (${product.brands})`
        : product.productName;
      await logCustomMeal(userId, displayName, massNum, nutrients);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to log meal');
    } finally {
      setSaving(false);
    }
  };

  const resetScanner = () => {
    setProduct(null);
    setScannedBarcode(null);
    setNotFound(false);
    setError('');
    setMass('100');
  };

  // Calculate nutrients for current mass
  const calcNutrients = () => {
    if (!product) return null;
    const massNum = parseFloat(mass) || 0;
    const ratio = massNum / 100;
    return {
      calories: product.nutrientsPer100g.calories * ratio,
      protein: product.nutrientsPer100g.protein * ratio,
      fats: product.nutrientsPer100g.fats * ratio,
      carbs: product.nutrientsPer100g.carbohydrates * ratio,
    };
  };

  const nutrients = calcNutrients();

  // Hidden div for file-based scanning (html5-qrcode needs a DOM element)
  const hiddenReaderDiv = <div id="barcode-reader-file" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} />;

  // Loading state — looking up barcode
  if (looking) {
    return (
      <div className="space-y-4">
        {hiddenReaderDiv}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-400 mb-4" />
          <p className="text-neutral-300 font-medium">Looking up barcode...</p>
          <p className="text-neutral-500 text-sm mt-1">{scannedBarcode}</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (notFound) {
    return (
      <div className="space-y-4">
        {hiddenReaderDiv}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-200 mb-1">
            Product Not Found
          </h3>
          <p className="text-neutral-400 text-sm mb-1">
            Barcode: {scannedBarcode}
          </p>
          <p className="text-neutral-500 text-xs mb-6">
            This product isn&apos;t in the Open Food Facts database yet.
          </p>
          <button
            type="button"
            onClick={resetScanner}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg transition font-medium text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Scan Another
          </button>
        </div>
      </div>
    );
  }

  // Product found — show details and log form
  if (product) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {hiddenReaderDiv}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Product card */}
        <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
          <div className="flex gap-4">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.productName}
                className="w-16 h-16 object-contain rounded-lg bg-neutral-900 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-7 h-7 text-neutral-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-neutral-50 text-base leading-tight truncate">
                {product.productName}
              </h3>
              {product.brands && (
                <p className="text-neutral-400 text-sm truncate">
                  {product.brands}
                </p>
              )}
              <p className="text-neutral-500 text-xs mt-1">
                {product.nutrientsPer100g.calories.toFixed(0)} kcal per 100g
              </p>
            </div>
            <button
              type="button"
              onClick={resetScanner}
              className="text-neutral-500 hover:text-neutral-300 p-1 self-start flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Amount eaten
          </label>
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-flex items-center border border-neutral-700 rounded-lg bg-neutral-950 px-3 py-2">
              <input
                type="number"
                value={mass}
                onChange={(e) => setMass(e.target.value)}
                className="w-16 bg-transparent text-neutral-50 font-medium focus:outline-none text-sm text-center [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [-moz-appearance:textfield]"
                placeholder="100"
                min="0"
                step="1"
              />
              <span className="text-neutral-500 text-sm ml-1">g</span>
            </div>
            {product.servingSize && (
              <span className="text-xs text-neutral-500">
                Serving: {product.servingSize}g
              </span>
            )}
          </div>

          {/* Quick amount presets — scrollable */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {[25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setMass(String(g))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${mass === String(g)
                    ? 'bg-neutral-600 text-neutral-50'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                  }`}
              >
                {g}g
              </button>
            ))}
          </div>
        </div>

        {/* Nutrition summary */}
        {nutrients && (
          <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-50 mb-3">
              {parseFloat(mass) || 0}g Nutrition
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-neutral-400 text-xs">Calories</p>
                <p className="text-neutral-50 text-lg font-bold">
                  {nutrients.calories.toFixed(0)} kcal
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs">Protein</p>
                <p className="text-neutral-50 text-lg">
                  {nutrients.protein.toFixed(1)}g
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs">Fats</p>
                <p className="text-neutral-50 text-lg">
                  {nutrients.fats.toFixed(1)}g
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs">Carbs</p>
                <p className="text-neutral-50 text-lg">
                  {nutrients.carbs.toFixed(1)}g
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Log button */}
        <button
          type="button"
          onClick={handleLog}
          disabled={saving || !mass || parseFloat(mass) <= 0}
          className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-50 font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {saving ? 'Logging...' : 'Log Meal'}
        </button>
      </div>
    );
  }

  // Default state — scanner view
  return (
    <div className="space-y-4">
      {hiddenReaderDiv}

      {/* Hidden file input for photo scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        id="barcode-file-input"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {cameraError ? (
        /* Camera failed — show error + photo fallback */
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-14 h-14 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <CameraOff className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-neutral-200 mb-2">
            Camera Unavailable
          </h3>
          <p className="text-neutral-400 text-sm mb-5 max-w-xs">{cameraError}</p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Primary: scan from photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanningImage}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-xl transition font-semibold text-sm active:scale-[0.97] disabled:opacity-50"
            >
              {scanningImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
              {scanningImage ? 'Scanning...' : 'Scan from Photo'}
            </button>

            {/* Manual barcode entry */}
            <div className="w-full">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
                  <Hash className="w-4 h-4 text-neutral-500 flex-shrink-0 mr-2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleManualLookup(); } }}
                    placeholder="Enter barcode number"
                    className="flex-1 bg-transparent text-neutral-50 text-sm focus:outline-none placeholder:text-neutral-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleManualLookup}
                  disabled={lookingUpManual || !manualBarcode.trim()}
                  className="p-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg transition disabled:opacity-40 flex-shrink-0"
                >
                  {lookingUpManual ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-neutral-600 text-xs mt-1.5 text-left">
                The number printed below the barcode lines
              </p>
            </div>

            {/* Secondary: retry camera */}
            <button
              type="button"
              onClick={startScanning}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 rounded-xl transition text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Try Camera Again
            </button>
          </div>
        </div>
      ) : scanning ? (
        /* Camera viewfinder */
        <div className="relative">
          <div
            id="barcode-reader"
            ref={readerDivRef}
            className="w-full rounded-xl overflow-hidden bg-black"
            style={{ minHeight: '280px' }}
          />

          {/* Scanning indicator */}
          <div className="flex items-center justify-center gap-2 mt-3 text-neutral-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm">Point camera at barcode</span>
          </div>

          <button
            type="button"
            onClick={stopScanning}
            className="w-full mt-3 py-2 rounded-lg border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          {/* Custom styling to override html5-qrcode defaults */}
          <style jsx global>{`
            #barcode-reader {
              border: none !important;
            }
            #barcode-reader video {
              border-radius: 0.75rem;
            }
            /* Hide the default html5-qrcode UI elements */
            #barcode-reader__dashboard,
            #barcode-reader__status_span,
            #barcode-reader__header_message {
              display: none !important;
            }
            /* Style the scan region */
            #barcode-reader__scan_region {
              min-height: 250px;
            }
            #barcode-reader__scan_region img {
              display: none !important;
            }
          `}</style>
        </div>
      ) : (
        /* Start scanning prompt — two options */
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-20 h-20 bg-neutral-800/80 rounded-2xl flex items-center justify-center mb-5 border border-neutral-700">
            <Camera className="w-9 h-9 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-200 mb-2">
            Scan Barcode
          </h3>
          <p className="text-neutral-500 text-sm mb-6 max-w-xs">
            Scan a product barcode to instantly look up nutrition info from Open Food Facts.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Primary: live camera (only if HTTPS) */}
            {isSecureContext ? (
              <button
                type="button"
                onClick={startScanning}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-xl transition font-semibold text-sm active:scale-[0.97]"
              >
                <Camera className="w-5 h-5" />
                Open Camera
              </button>
            ) : null}

            {/* Scan from photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanningImage}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition font-semibold text-sm active:scale-[0.97] disabled:opacity-50 ${isSecureContext
                  ? 'border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-50'
                }`}
            >
              {scanningImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5" />
              )}
              {scanningImage ? 'Scanning...' : 'Scan from Photo'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-neutral-600 text-xs">or type it</span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>

            {/* Manual barcode entry */}
            <div className="w-full">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
                  <Hash className="w-4 h-4 text-neutral-500 flex-shrink-0 mr-2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleManualLookup(); } }}
                    placeholder="Enter barcode number"
                    className="flex-1 bg-transparent text-neutral-50 text-sm focus:outline-none placeholder:text-neutral-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleManualLookup}
                  disabled={lookingUpManual || !manualBarcode.trim()}
                  className="p-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-50 rounded-lg transition disabled:opacity-40 flex-shrink-0"
                >
                  {lookingUpManual ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-neutral-600 text-xs mt-1.5">
                The number printed below the barcode lines
              </p>
            </div>

          </div>

          {/* Hidden reader div for html5-qrcode initialization */}
          <div id="barcode-reader" className="hidden" />
        </div>
      )}
    </div>
  );
};
