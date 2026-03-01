"use client"
import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { toast } from 'sonner';

const GET_UPLOAD_URL = gql`
  query GetUploadUrl($contentType: String!, $category: String!) {
    getUploadUrl(contentType: $contentType, category: $category) {
      uploadUrl
      publicUrl
      objectKey
      expiresAt
    }
  }
`;

interface GetUploadUrlResponse {
  getUploadUrl: {
    uploadUrl: string;
    publicUrl: string;
    objectKey?: string;
    expiresAt?: string;
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

/**
 * Custom hook for handling image upload workflow with cropping functionality.
 * 
 * @description
 * This hook manages the complete image upload lifecycle:
 * 1. File selection and validation
 * 2. Image cropping via a modal interface
 * 3. Upload to cloud storage via signed URL
 * 4. Success/error handling with toast notifications
 * 
 * @example
 * // Basic usage - Avatar upload
 * const {
 *   croppedImage,
 *   rawImage,
 *   showCropper,
 *   uploading,
 *   handleFileSelect,
 *   handleCropConfirm,
 *   handleCropCancel,
 *   uploadImage,
 *   reset
 * } = useImageUpload({
 *   category: 'avatar',
 *   onSuccess: (url) => {
 *     console.log('Image uploaded:', url);
 *     updateUserAvatar(url);
 *   }
 * });
 * 
 * @example
 * // Complete implementation in a component
 * function ProfileEditor() {
 *   const imageUpload = useImageUpload({
 *     category: 'avatar',
 *     contentType: 'image/jpeg',
 *     onSuccess: (publicUrl) => {
 *       // Update user profile with new avatar URL
 *       updateProfile({ avatarUrl: publicUrl });
 *     },
 *     onError: (error) => {
 *       // Handle error (already shows toast, but you can do more)
 *       logError('Avatar upload failed', error);
 *     }
 *   });
 * 
 *   // 1. File input for selecting images
 *   <input
 *     type="file"
 *     accept="image/*"
 *     onChange={(e) => {
 *       const file = e.target.files?.[0];
 *       if (file) imageUpload.handleFileSelect(file);
 *     }}
 *   />
 * 
 *   // 2. Show preview of cropped image
 *   {imageUpload.croppedImage && (
 *     <img src={imageUpload.croppedImage} alt="Preview" />
 *   )}
 * 
 *   // 3. Render cropper modal when user selects an image
 *   {imageUpload.rawImage && (
 *     <ImageCropper
 *       open={imageUpload.showCropper}
 *       src={imageUpload.rawImage}
 *       onCancel={imageUpload.handleCropCancel}
 *       onConfirm={imageUpload.handleCropConfirm}
 *     />
 *   )}
 * 
 *   // 4. Upload button - only call when ready to upload
 *   <button
 *     onClick={async () => {
 *       const url = await imageUpload.uploadImage();
 *       if (url) {
 *         // Upload successful, url contains the public URL
 *       }
 *     }}
 *     disabled={!imageUpload.croppedImage || imageUpload.uploading}
 *   >
 *     {imageUpload.uploading ? 'Uploading...' : 'Save Photo'}
 *   </button>
 * }
 * 
 * @example
 * // Drag and drop implementation
 * function DragDropUploader() {
 *   const imageUpload = useImageUpload({ category: 'group_avatar' });
 * 
 *   const handleDrop = (e: React.DragEvent) => {
 *     e.preventDefault();
 *     const file = e.dataTransfer.files[0];
 *     if (file) {
 *       imageUpload.handleFileSelect(file); // Validates and shows cropper
 *     }
 *   };
 * 
 *   return (
 *     <div
 *       onDrop={handleDrop}
 *       onDragOver={(e) => e.preventDefault()}
 *     >
 *       Drop image here
 *     </div>
 *   );
 * }
 * 
 * @workflow
 * User selects file → handleFileSelect validates → rawImage set → showCropper=true →
 * User crops → handleCropConfirm saves cropped data → croppedImage set →
 * User clicks save → uploadImage() uploads to cloud → onSuccess callback with publicUrl
 * 
 * @param {UseImageUploadOptions} options - Configuration options
 * @param {ImageCategory} options.category - Upload category: 'avatar' or 'group_avatar'
 * @param {string} [options.contentType='image/jpeg'] - MIME type for upload
 * @param {(publicUrl: string) => void} [options.onSuccess] - Called after successful upload with the public URL
 * @param {(error: Error) => void} [options.onError] - Called when upload fails
 * 
 * @returns {UseImageUploadReturn} Object containing state and action functions
 * 
 * @property {boolean} uploading - True during upload process (disable UI during this)
 * @property {File | null} selectedFile - Original file object selected by user
 * @property {string | null} rawImage - Base64 data URL of original image (pass to cropper)
 * @property {string | null} croppedImage - Base64 data URL of cropped image (use for preview)
 * @property {boolean} showCropper - Control visibility of cropper modal
 * @property {(file: File) => void} handleFileSelect - Pass File object to start the workflow
 * @property {(croppedImageData: string) => void} handleCropConfirm - Called by cropper with result
 * @property {() => void} handleCropCancel - Cancels cropping and resets selection
 * @property {() => Promise<string | null>} uploadImage - Uploads cropped image, returns public URL or null
 * @property {() => void} reset - Clears all state (useful when closing modals)
 * 
 * @notes
 * - Always validate that croppedImage exists before calling uploadImage()
 * - The hook shows toast notifications automatically for errors and success
 * - uploadImage() returns null on failure, check the return value
 * - Call reset() when closing modals to prevent stale state
 * - The cropper modal is NOT included - you must provide your own (e.g., CircularImageCropper)
 * - File validation happens in handleFileSelect (only image/* types accepted)
 */
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

  /**
   * Initiates the image selection and cropping workflow.
   * Validates file type and converts to base64 for cropper.
   * 
   * @param {File} file - The image file to process
   * @fires Shows error toast if file is not a valid image
   * @triggers Sets rawImage and showCropper=true on success
   */
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

  /**
   * Confirms the cropped image from the cropper component.
   * Stores the cropped result and hides the cropper.
   * 
   * @param {string} croppedImageData - Base64 data URL of the cropped image
   * @triggers Sets croppedImage, hides cropper, clears rawImage
   */
  const handleCropConfirm = (croppedImageData: string) => {
    setCroppedImage(croppedImageData);
    setShowCropper(false);
    setRawImage(null);
  };

  /**
   * Cancels the cropping process and resets the selection.
   * User can select a different file after canceling.
   */
  const handleCropCancel = () => {
    setShowCropper(false);
    setRawImage(null);
    setSelectedFile(null);
  };

  /**
   * Uploads the cropped image to cloud storage.
   * 
   * @async
   * @returns {Promise<string | null>} The public URL of uploaded image, or null if failed
   * @throws Will not throw, but returns null and shows error toast on failure
   * @requires croppedImage must be set (returns null immediately if not)
   * 
   * @process
   * 1. Requests signed upload URL from GraphQL API
   * 2. Converts base64 cropped image to Blob
   * 3. PUTs blob to signed URL
   * 4. Returns public URL on success
   * 
   * @sideEffects
   * - Sets uploading=true during process
   * - Shows loading/success/error toasts
   * - Calls onSuccess callback with public URL
   * - Calls onError callback on failure
   */
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

      const { uploadUrl, publicUrl } = uploadData.getUploadUrl;

      // Step 2: Convert base64 to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();

      // Step 3: Upload to the signed URL
      const uploadResponse = await fetch(uploadUrl, {
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

  /**
   * Resets all state to initial values.
   * Useful when closing modals or starting fresh.
   * 
   * @usage Call this when:
   * - Modal is closed/dismissed
   * - Upload completes and you want to allow new upload
   * - User cancels the entire operation
   */
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