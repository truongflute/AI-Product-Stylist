import { GoogleGenAI, Modality, Part } from "@google/genai";

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
    return {
        inlineData: {
            data: base64String.split(',')[1],
            mimeType: 'image/png'
        }
    };
};


export const generateStyledImage = async (
    apiKey: string,
    modelImage: File,
    productImage: File,
    prompt: string,
    productMask: string | null
): Promise<string> => {
    if (!apiKey) {
        throw new Error("API key không được cung cấp. Vui lòng nhập API key của bạn.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const modelImageBase64 = await fileToBase64(modelImage);
        const productImageBase64 = await fileToBase64(productImage);

        const modelImagePart: Part = {
            inlineData: {
                data: modelImageBase64,
                mimeType: modelImage.type,
            },
        };

        const productImagePart: Part = {
            inlineData: {
                data: productImageBase64,
                mimeType: productImage.type,
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
        throw new Error("Không thể tạo ảnh. Vui lòng thử lại.");
    }
};