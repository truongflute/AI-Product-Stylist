import React, { useRef, useEffect, useState, useCallback } from 'react';
import { XMarkIcon } from './icons';

interface ImageMaskerProps {
  imageUrl: string;
  onSave: (maskDataUrl: string) => void;
  onClose: () => void;
}

const ImageMasker: React.FC<ImageMaskerProps> = ({ imageUrl, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);

  const getCanvasContext = () => canvasRef.current?.getContext('2d');

  const clearCanvas = useCallback(() => {
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    image.onload = () => {
      if(canvas) {
        // Set canvas dimensions based on image, but constrained by viewport
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.7;
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        
        canvas.width = image.width * ratio;
        canvas.height = image.height * ratio;
        
        if (imageRef.current) {
            imageRef.current.style.width = `${canvas.width}px`;
            imageRef.current.style.height = `${canvas.height}px`;
        }
        
        clearCanvas();
      }
    };
  }, [imageUrl, clearCanvas]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
  }

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    const ctx = getCanvasContext();
    if (ctx) {
      const { x, y } = getCoordinates(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (ctx) {
      const { x, y } = getCoordinates(event);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    const ctx = getCanvasContext();
    if (ctx) {
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const maskDataUrl = canvas.toDataURL('image/png');
      onSave(maskDataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-4xl flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Tạo mặt nạ cho sản phẩm</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <XMarkIcon />
            </button>
        </div>
        <p className="text-sm text-slate-400">Dùng cọ tô lên vùng sản phẩm bạn muốn sử dụng. AI sẽ chỉ tập trung vào khu vực màu trắng bạn vẽ.</p>
        
        <div className="relative w-full mx-auto flex justify-center items-center">
             <img ref={imageRef} src={imageUrl} alt="Product" className="object-contain rounded-lg" />
             <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 cursor-crosshair opacity-50"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3">
                <label htmlFor="brushSize" className="text-sm font-medium text-slate-300">Kích cỡ cọ:</label>
                <input
                    type="range"
                    id="brushSize"
                    min="5"
                    max="150"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-36"
                />
                 <span className="text-white text-sm w-8 text-center">{brushSize}</span>
            </div>
             <div className="flex items-center gap-2">
                 <button 
                    onClick={clearCanvas}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Xoá
                </button>
                <button 
                    onClick={handleSave}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Lưu mặt nạ
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageMasker;