import React, { useState, useCallback } from 'react';
import { ImageFile } from './types';
import ImageUploader from './components/ImageUploader';
import ImageMasker from './components/ImageMasker';
import { generateStyledImage } from './services/geminiService';
import Spinner from './components/Spinner';
import { MagicWandIcon, PhotoIcon, ScissorsIcon } from './components/icons';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini-api-key') || '');
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [productImage, setProductImage] = useState<ImageFile | null>(null);
  const [productMask, setProductMask] = useState<string | null>(null);
  const [isMaskerOpen, setIsMaskerOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
  };
  
  const handleProductSelect = (imageFile: ImageFile) => {
    setProductImage(imageFile);
    setProductMask(null); // Reset mask when a new image is uploaded
  }

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setError('Vui lòng cung cấp API Key của bạn.');
      return;
    }
    if (!modelImage || !productImage || !prompt) {
      setError('Vui lòng tải lên cả hai ảnh và nhập mô tả.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateStyledImage(apiKey, modelImage.file, productImage.file, prompt, productMask);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, modelImage, productImage, prompt, productMask]);
  
  const isButtonDisabled = !modelImage || !productImage || !prompt || !apiKey || isLoading;

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      {isMaskerOpen && productImage && (
        <ImageMasker 
          imageUrl={productImage.previewUrl}
          onSave={(maskDataUrl) => {
            setProductMask(maskDataUrl);
            setIsMaskerOpen(false);
          }}
          onClose={() => setIsMaskerOpen(false)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            AI Product Stylist By THMXH.COM
          </h1>
          <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
            Ghép ảnh người mẫu với sản phẩm của bạn một cách kỳ diệu. Tải ảnh lên và để AI thực hiện phần còn lại.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cột điều khiển */}
          <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col gap-6">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-slate-300 mb-2">
                Gemini API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Nhập API Key của bạn vào đây"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 placeholder-slate-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploader
                id="model-image"
                label="1. Tải ảnh người mẫu"
                image={modelImage}
                onImageSelect={setModelImage}
              />
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">2. Tải ảnh sản phẩm</label>
                    {productImage && (
                        <button 
                            onClick={() => setIsMaskerOpen(true)}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            <ScissorsIcon className="w-4 h-4" />
                            Chỉnh sửa & Chọn sản phẩm
                        </button>
                    )}
                </div>
                <ImageUploader
                    id="product-image"
                    label=""
                    image={productImage}
                    onImageSelect={handleProductSelect}
                />
                 {productMask && (
                    <div className="mt-2 text-center">
                        <p className="text-xs text-slate-400 mb-1">Mặt nạ sản phẩm đã được áp dụng:</p>
                        <img src={productMask} alt="Product Mask" className="w-16 h-16 object-contain rounded-md mx-auto bg-slate-700 p-1" />
                    </div>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-slate-300 mb-2">
                3. Mô tả cách bạn muốn ghép ảnh
              </label>
              <textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: 'Người mẫu mặc chiếc áo thun này' hoặc 'Đặt chiếc túi xách lên tay người mẫu'"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 placeholder-slate-500"
              />
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={isButtonDisabled}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo...
                </>
              ) : (
                <>
                  <MagicWandIcon />
                  Tạo ảnh
                </>
              )}
            </button>
          </div>
          
          {/* Cột kết quả */}
          <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 flex items-center justify-center min-h-[400px] lg:min-h-full">
            {error && (
              <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                <h3 className="font-bold text-lg">Lỗi!</h3>
                <p>{error}</p>
              </div>
            )}
            
            {!error && isLoading && <Spinner />}

            {!error && !isLoading && !generatedImage && (
              <div className="text-center text-slate-500">
                <PhotoIcon className="mx-auto w-20 h-20 text-slate-600" />
                <p className="mt-4 text-lg">Ảnh kết quả sẽ hiển thị ở đây</p>
              </div>
            )}

            {!error && !isLoading && generatedImage && (
              <div className="w-full h-full">
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="w-full h-full object-contain rounded-lg" 
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;