import { GoogleGenAI, Modality, Part } from "@google/genai";

// Utility to resize an image file
const resizeImage = (file: File, maxSize: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = image;

            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error("Không thể lấy context của canvas"));
            }
            ctx.drawImage(image, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error("Chuyển đổi canvas sang Blob thất bại"));
                }
                const newFile = new File([blob], file.name, {
                    type: blob.type,
                    lastModified: Date.now(),
                });
                URL.revokeObjectURL(image.src); // Clean up object URL
                resolve(newFile);
            }, file.type, 0.95);
        };
        image.onerror = (err) => {
            URL.revokeObjectURL(image.src);
            reject(err);
        };
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix e.g. "data:image/png;base64,"
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

const base64StringToPart = (base64String: string): Part => {
    const [header, data] = base64String.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return {
        inlineData: {
            data: data,
            mimeType: mimeType
        }
    };
};


export const generateStyledImage = async (
    modelImage: File,
    productImage: File,
    prompt: string,
    productMask: string | null
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const MAX_IMAGE_SIZE_PX = 1024;
        const [resizedModelImage, resizedProductImage] = await Promise.all([
            resizeImage(modelImage, MAX_IMAGE_SIZE_PX),
            resizeImage(productImage, MAX_IMAGE_SIZE_PX)
        ]);
        
        const [modelImageBase64, productImageBase64] = await Promise.all([
            fileToBase64(resizedModelImage),
            fileToBase64(resizedProductImage)
        ]);

        const modelImagePart: Part = {
            inlineData: {
                data: modelImageBase64,
                mimeType: resizedModelImage.type,
            },
        };

        const productImagePart: Part = {
            inlineData: {
                data: productImageBase64,
                mimeType: resizedProductImage.type,
            },
        };

        const parts: Part[] = [modelImagePart, productImagePart];
        let textPrompt: string;

        if (productMask) {
            const productMaskPart = base64StringToPart(productMask);
            parts.push(productMaskPart);
            textPrompt = `You are an expert virtual fashion stylist specializing in photorealistic apparel try-on. Your task is to dress the model from the first image with the clothing item from the second image.

You are provided with:
1. An image of the target model.
2. An image of the product (a piece of clothing, potentially on another model).
3. A black and white mask. The white area in the mask precisely isolates the clothing item you must use from the second image.

Your goal is to generate a new image where the target model is wearing the isolated clothing item.

**Crucial Instructions:**
- **Fit and Realism:** The clothing must realistically fit the target model's body, conforming to their specific pose, body shape, and the lighting conditions of their original photo.
- **Replace, Don't Overlay:** The new clothing should replace any existing clothing worn by the target model in the corresponding area.
- **Isolate the Product:** You MUST ONLY use the clothing item from the white area of the mask. Completely ignore the original model, background, or any other elements from the product image (the black area of the mask).
- **Follow User Command:** Adhere to the user's specific styling instruction.

User's instruction: ${prompt}`;
        } else {
            textPrompt = `You are an expert fashion stylist. Your task is to realistically place the product from the second image onto the model in the first image. The new image should look photorealistic. If the product is clothing, the model should be wearing it in a way that fits their body and pose. Follow the user's styling instruction. User's instruction: ${prompt}`;
        }
        
        parts.push({ text: textPrompt });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }

        throw new Error("Không tìm thấy hình ảnh nào trong phản hồi của AI.");

    } catch (error) {
        console.error("Lỗi khi tạo ảnh:", error);
        
        let errorMessage = "Không thể tạo ảnh. Vui lòng thử lại.";
        const errorString = error.toString();

        if (errorString.includes('API key not valid') || errorString.includes('API_KEY_INVALID')) {
             errorMessage = "Lỗi xác thực: API key được cấu hình không hợp lệ. Vui lòng kiểm tra lại biến môi trường API_KEY.";
        } else if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota')) {
            errorMessage = "Đã vượt quá giới hạn sử dụng API (Lỗi 429). Vui lòng kiểm tra gói dịch vụ, thông tin thanh toán của bạn hoặc thử lại sau.";
        } else if (errorString.includes('400')) {
             errorMessage = "Yêu cầu không hợp lệ (Lỗi 400). Có thể do định dạng ảnh hoặc nội dung không được hỗ trợ. Vui lòng kiểm tra lại ảnh đầu vào và thử lại.";
        } else if (errorString.includes('500') || errorString.includes('503')) {
             errorMessage = "Lỗi từ máy chủ AI (Lỗi 50x). Dịch vụ có thể đang gặp sự cố hoặc quá tải. Vui lòng thử lại sau ít phút.";
        } else if (errorString.includes('deadline')) {
             errorMessage = "Yêu cầu đã hết thời gian chờ. Vui lòng kiểm tra kết nối mạng và thử lại.";
        } else if (error instanceof Error) {
            errorMessage = `Đã xảy ra lỗi: ${error.message}`;
        }

        throw new Error(errorMessage);
    }
};