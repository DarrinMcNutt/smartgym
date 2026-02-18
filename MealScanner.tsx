import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, Loader2, Utensils, Upload, RotateCcw, Save } from 'lucide-react';
import { MealAnalysis } from '../types';
import { analyzeMealImage } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

export const MealScanner: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isCapturing) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCapturing]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setCameraError("Camera access failed. Please use 'Upload Image' instead. (Browsers block camera on HTTP/IP addresses)");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      // Check if video is actually ready
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        alert("Camera not ready. Please wait or use Upload.");
        return;
      }

      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setImagePreview(imageData);
        setIsCapturing(false);
        stopCamera();
        handleAnalyze(imageData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setImagePreview(imageData);
        setIsCapturing(false);
        stopCamera();
        handleAnalyze(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const base64Data = base64Image.split(',')[1];
      const result = await analyzeMealImage(base64Data, 'image/jpeg');
      setAnalysis(result);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      alert(`AI Error: ${err.message || 'Check console for details'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMealLog = async () => {
    if (!analysis || !imagePreview) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsAnalyzing(true); // Re-use loading state for upload

      // 1. Upload image to Storage first
      const blob = await fetch(imagePreview).then(r => r.blob());
      const fileName = `${session.user.id}/meals/${Date.now()}.jpg`;
      const filePath = `meals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gym_uploads')
        .upload(filePath, blob);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error("Storage bucket 'gym_uploads' not found. Please run the setup SQL script.");
        }
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gym_uploads')
        .getPublicUrl(filePath);

      // 3. Save to database
      const { error: dbError } = await supabase
        .from('meal_logs')
        .insert([{
          user_id: session.user.id,
          food_name: analysis.foodName,
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fats: analysis.fats,
          fiber: analysis.fiber,
          sugar: analysis.sugar,
          weight: analysis.weight,
          score: analysis.healthScore,
          image_url: publicUrl // Save the URL instead of base64
        }]);

      if (dbError) throw dbError;

      alert("Meal saved to log successfully!");
      setIsCapturing(true);
      setAnalysis(null);
      setImagePreview(null);
    } catch (err: any) {
      console.error("Error saving meal:", err);
      alert(`Failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="pb-24 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
      <h1 className="text-2xl font-bold text-white mb-4">AI Meal Scan</h1>

      {isCapturing ? (
        <div className="flex-1 bg-black rounded-3xl relative overflow-hidden flex flex-col items-center justify-center border border-zinc-800">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900">
              <div className="bg-red-500/10 p-4 rounded-full mb-4">
                <X className="text-red-500" size={32} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Camera Unavailable</h3>
              <p className="text-zinc-400 text-sm mb-6">{cameraError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-lime-400 text-black px-6 py-3 rounded-xl font-bold flex items-center"
              >
                <Upload size={20} className="mr-2" />
                Upload Photo Instead
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay */}
          <div className="absolute inset-0 border-2 border-lime-400/50 rounded-3xl z-10 m-4 pointer-events-none"></div>

          <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-center space-x-6">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 bg-zinc-900/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-zinc-800"
            >
              <Upload size={24} />
            </button>

            <button
              onClick={captureImage}
              className="w-20 h-20 bg-lime-400 rounded-full border-4 border-black/50 shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Camera size={32} className="text-black" />
            </button>

            <div className="w-14 h-14"></div> {/* Spacer for balance */}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-6">
          {/* Image Preview */}
          <div className="h-64 rounded-3xl overflow-hidden relative border border-zinc-800">
            <img src={imagePreview!} alt="Meal" className="w-full h-full object-cover" />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 size={48} className="text-lime-400 animate-spin mb-4" />
                <span className="text-lime-400 font-bold animate-pulse">Analyzing Macros...</span>
              </div>
            )}
          </div>

          {/* Results */}
          {!isAnalyzing && analysis && (
            <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 animate-slide-up flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{analysis.foodName}</h2>
                  <p className="text-zinc-500 text-sm">{analysis.portionSize} • {analysis.weight}g</p>
                </div>
                <button onClick={() => setIsCapturing(true)} className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white">
                  <RotateCcw size={20} />
                </button>
              </div>

              {/* Main Macros Grid */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="bg-black/40 p-3 rounded-2xl text-center">
                  <span className="block text-xl font-bold text-white">{analysis.calories}</span>
                  <span className="text-[10px] text-zinc-500 uppercase">Kcal</span>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl text-center">
                  <span className="block text-xl font-bold text-blue-400">{analysis.protein}g</span>
                  <span className="text-[10px] text-zinc-500 uppercase">Prot</span>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl text-center">
                  <span className="block text-xl font-bold text-yellow-400">{analysis.carbs}g</span>
                  <span className="text-[10px] text-zinc-500 uppercase">Carb</span>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl text-center">
                  <span className="block text-xl font-bold text-red-400">{analysis.fats}g</span>
                  <span className="text-[10px] text-zinc-500 uppercase">Fat</span>
                </div>
              </div>

              {/* Advanced Stats Table */}
              <div className="bg-black/20 rounded-2xl p-4 mb-6 border border-white/5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Fiber</span>
                    <span className="text-white font-medium">{analysis.fiber}g</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Sugar</span>
                    <span className="text-white font-medium">{analysis.sugar}g</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Health Score</span>
                    <span className={`font-bold ${analysis.healthScore > 80 ? 'text-lime-400' : 'text-yellow-400'}`}>
                      {analysis.healthScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Ingredients</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.ingredients?.map((ing, i) => (
                    <span key={i} className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-lime-400/5 p-4 rounded-2xl mb-6 border border-lime-400/10">
                <h4 className="text-sm font-bold text-lime-400 mb-2 flex items-center">
                  <Utensils size={14} className="mr-2" />
                  AI Analysis Insight
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed italic">
                  "{analysis.advice}"
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveMealLog}
                  className="flex-1 bg-lime-400 py-4 rounded-2xl text-black font-bold flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity"
                >
                  <Save size={20} />
                  <span>Save to Log</span>
                </button>
                <button
                  onClick={() => setIsCapturing(true)}
                  className="px-6 bg-zinc-800 py-4 rounded-2xl text-white font-bold flex items-center justify-center hover:bg-zinc-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};