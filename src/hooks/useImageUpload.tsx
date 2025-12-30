"use client"
import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { toast } from 'sonner';

const GET_UPLOAD_URL = gql`
  query GetUploadUrl($contentType: String!, $category: String!) {
    getUploadUrl(contentType: $contentType, category: $category) {
      url
      publicUrl
      path
    }
  }
`;

interface GetUploadUrlResponse {
  getUploadUrl: {
    url: string;
    publicUrl: string;
    path: string;
  };
}

type ImageCategory = 'avatar' | 'group_avatar';

interface UseImageUploadOptions {
  category: ImageCategory;
  contentType?: string;
  onSuccess?: (publicUrl: string) => void;
  onError?: (error: Error) => void;
}

interface UseImageUploadReturn {
  // State
  uploading: boolean;
  selectedFile: File | null;
  rawImage: string | null;
  croppedImage: string | null;
  showCropper: boolean;
  
  // Actions
  handleFileSelect: (file: File) => void;
  handleCropConfirm: (croppedImageData: string) => void;
  handleCropCancel: () => void;
  uploadImage: () => Promise<string | null>;
  reset: () => void;
}

export const useImageUpload = ({
  category,
  contentType = 'image/jpeg',
  onSuccess,
  onError,
}: UseImageUploadOptions): UseImageUploadReturn => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setRawImage(e.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid image file');
    }
  };

  const handleCropConfirm = (croppedImageData: string) => {
    setCroppedImage(croppedImageData);
    setShowCropper(false);
    setRawImage(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setRawImage(null);
    setSelectedFile(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!croppedImage) {
      toast.error('No image selected');
      return null;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading image...');

    try {
      // Step 1: Get upload URL
      const { data: uploadData } = await getUploadUrl({
        variables: {
          contentType,
          category,
        },
      });

      if (!uploadData?.getUploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      const { url, publicUrl } = uploadData.getUploadUrl;

      // Step 2: Convert base64 to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();

      // Step 3: Upload to the signed URL
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      toast.dismiss(toastId);
      toast.success('Image uploaded successfully');

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess(publicUrl);
      }

      return publicUrl;
    } catch (err) {
      toast.dismiss(toastId);
      const error = err instanceof Error ? err : new Error('Failed to upload image');
      toast.error(error.message);
      
      // Call onError callback
      if (onError) {
        onError(error);
      }

      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setCroppedImage(null);
    setRawImage(null);
    setShowCropper(false);
    setUploading(false);
  };

  return {
    uploading,
    selectedFile,
    rawImage,
    croppedImage,
    showCropper,
    handleFileSelect,
    handleCropConfirm,
    handleCropCancel,
    uploadImage,
    reset,
  };
};