
import React, { useCallback, useRef } from 'react';
import { ImageFile } from '../types';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  id: string;
  label: string;
  image: ImageFile | null;
  onImageSelect: (imageFile: ImageFile) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, image, onImageSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onImageSelect({ file, previewUrl });
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div
        onClick={handleClick}
        className="relative w-full h-48 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-colors duration-300 group"
      >
        <input
          type="file"
          id={id}
          ref={inputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
        />
        {image ? (
          <img src={image.previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg p-1" />
        ) : (
          <div className="text-center text-slate-500 group-hover:text-cyan-400 transition-colors duration-300">
            <UploadIcon className="w-10 h-10 mx-auto" />
            <p className="mt-2 text-sm">Nhấn để tải ảnh lên</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
