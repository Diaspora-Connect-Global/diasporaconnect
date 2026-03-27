"use client";
import React from "react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  CREATE_PRODUCT,
  GET_MY_VENDOR,
  PUBLISH_PRODUCT,
  REQUEST_UPLOAD_URL,
} from "@/services/gql/vendor";
import { uploadFileToVendorSignedUrl } from "@/lib/vendor-upload";
import type { GetMyVendorResponse, RequestVendorUploadUrlResponse } from "@/services/gql/types/vendor";
import { handleVendorError } from "@/lib/vendor-error-mapper";
import VendorKycRequiredModal from "@/components/vendors/VendorKycRequiredModal";

type FormDataType = {
  name: string;
  description: string;
  quantity: string;
  category: string;
  price: string;
  discount: string;
  applyDiscount: boolean;
};

type ImageType = {
  file: File;
  preview: string;
};

export default function AddProductForm() {
  const t = useTranslations('vendors.products');
  const tForm = useTranslations('vendors.products.form');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  
  const [formData, setFormData] = React.useState<FormDataType>({
    name: "",
    description: "",
    quantity: "",
    category: "Men fashion",
    price: "",
    discount: "",
    applyDiscount: false,
  });

  const [images, setImages] = React.useState<ImageType[]>([]);
  const [features, setFeatures] = React.useState<string[]>([]);
  const [newFeature, setNewFeature] = React.useState<string>("");
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [isKycModalOpen, setIsKycModalOpen] = React.useState(false);
  const { data: vendorData } = useQuery<GetMyVendorResponse>(GET_MY_VENDOR);
  const vendorId = vendorData?.getMyVendor?.id;
  const [requestUploadUrl] = useMutation<RequestVendorUploadUrlResponse>(REQUEST_UPLOAD_URL);
  const [createProduct, { loading: creatingProduct }] = useMutation<{ createProduct: string }>(CREATE_PRODUCT);
  const [publishProduct, { loading: publishingProduct }] = useMutation<{ publishProduct: boolean }>(PUBLISH_PRODUCT);

  const availableSizes = [
    { key: "Small", label: tForm('small') },
    { key: "Medium", label: tForm('medium') },
    { key: "Large", label: tForm('large') },
    { key: "X-Large", label: tForm('xLarge') }
  ];

  const handleInputChange = <K extends keyof FormDataType>(
    field: K,
    value: FormDataType[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    const newImages: ImageType[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, 4));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;

    setFeatures((prev) => [...prev, newFeature.trim()]);
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSize = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const uploadImagesAndGetReadUrls = async (): Promise<string[]> => {
    if (!vendorId || images.length === 0) {
      return [];
    }

    const uploaded: string[] = [];
    for (const image of images) {
      const { data } = await requestUploadUrl({
        variables: {
          vendorId,
          fileName: image.file.name,
          contentType: image.file.type || "image/jpeg",
          fileType: "product",
        },
      });

      const uploadPayload = data?.requestUploadUrl ?? data?.requestVendorUploadUrl;
      if (!uploadPayload) {
        throw new Error("Failed to request upload URL");
      }

      await uploadFileToVendorSignedUrl(uploadPayload.uploadUrl, image.file, image.file.type);
      uploaded.push(uploadPayload.readUrl);
    }

    return uploaded;
  };

  const createProductDraft = async (): Promise<string | null> => {
    if (!vendorId) {
      handleVendorError({
        error: new Error("Vendor profile not found"),
        locale,
        router,
      });
      return null;
    }
    if (!formData.name.trim() || !formData.description.trim() || !formData.price || !formData.quantity) {
      toast.error("Please complete required fields");
      return null;
    }

    const imageUrls = await uploadImagesAndGetReadUrls();

    const { data } = await createProduct({
      variables: {
        vendorId,
        title: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        currency: "GHS",
        inventoryCount: Number(formData.quantity),
        productType: "PHYSICAL",
        images: imageUrls,
        tags: [...features, ...sizes],
      },
    });

    return data?.createProduct ?? null;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      quantity: "",
      category: "Men fashion",
      price: "",
      discount: "",
      applyDiscount: false,
    });

    setImages([]);
    setFeatures([]);
    setSizes([]);
  };

  const handleSaveDraft = async () => {
    try {
      const productId = await createProductDraft();
      if (!productId) return;
      toast.success(tForm('savedAsDraft'));
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
        openKycModal: () => setIsKycModalOpen(true),
      });
    }
  };

  const handleSaveAndAddAnother = async () => {
    try {
      const productId = await createProductDraft();
      if (!productId) return;
      toast.success(tForm('savedReadyAnother'));
      resetForm();
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
        openKycModal: () => setIsKycModalOpen(true),
      });
    }
  };

  const handleSaveAndPreview = async () => {
    try {
      const productId = await createProductDraft();
      if (!productId) return;
      await publishProduct({ variables: { productId } });
      toast.success("Product published");
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
        openKycModal: () => setIsKycModalOpen(true),
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button className="text-sm text-text-secondary hover:text-text-primary mb-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('addNewProduct')}
        </button>

        <h1 className="text-2xl font-semibold text-text-primary">{t('addNewProduct')}</h1>
      </div>

      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">{tForm('name')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder={tForm('namePlaceholder')}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {tForm('description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder={tForm('descriptionPlaceholder')}
            rows={4}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg resize-none"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {tForm('quantity')}
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            placeholder={tForm('quantityPlaceholder')}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {tForm('addImageOfProduct')}
          </label>

          <div className="grid grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative aspect-square bg-surface-subtle rounded-lg overflow-hidden"
              >
                <img
                  src={img.preview}
                  alt={tForm('productImage', { number: index + 1 })}
                  className="w-full h-full object-cover"
                />

                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-surface-danger text-text-white rounded-full"
                  aria-label={tCommon('removeImage')}
                >
                  ×
                </button>
              </div>
            ))}

            {images.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-border-subtle rounded-lg flex items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="text-text-tertiary text-3xl">+</span>
              </label>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {tForm('productCategory')}
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-surface-default"
          >
            <option value="Men fashion">{t('menFashion')}</option>
            <option value="Women fashion">{t('womenFashion')}</option>
            <option value="Electronics">{tForm('electronics')}</option>
            <option value="Home & Garden">{tForm('homeGarden')}</option>
          </select>
        </div>

        {/* Price / Discount */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t('price')}</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange("price", e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{tForm('discount')}</label>
            <input
              type="number"
              value={formData.discount}
              onChange={(e) => handleInputChange("discount", e.target.value)}
              className="w-full px-4 py-2 border border-border-subtle rounded-lg"
            />
          </div>
        </div>

        {/* Apply Discount */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="applyDiscount"
            checked={formData.applyDiscount}
            onChange={(e) =>
              handleInputChange("applyDiscount", e.target.checked)
            }
          />
          <label htmlFor="applyDiscount">{tForm('applyDiscount')}</label>
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {tForm('productFeatures')}
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFeature()}
              className="flex-1 px-4 py-2 border border-border-subtle rounded-lg"
            />

            <button
              onClick={addFeature}
              className="px-4 py-2 text-text-brand"
            >
              {tForm('addFeature')}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-surface-subtle rounded-full text-sm"
              >
                {feature}
                <button
                  onClick={() => removeFeature(index)}
                  className="ml-2"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div>
          <label className="block text-sm font-medium mb-2">{tForm('size')}</label>

          <div className="flex gap-2">
            {availableSizes.map((size) => (
              <button
                key={size.key}
                onClick={() => toggleSize(size.key)}
                type="button"
                className={`px-4 py-2 border rounded-lg ${
                  sizes.includes(size.key)
                    ? "border-border-brand bg-surface-brand-subtle text-text-brand"
                    : "border-border-subtle"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <button onClick={handleSaveDraft} className="border px-6 py-2 rounded-lg">
            {(creatingProduct || publishingProduct) ? "Saving..." : tForm('saveToDraft')}
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSaveAndAddAnother}
              className="border px-6 py-2 rounded-lg"
            >
              {tForm('saveAndAnother')}
            </button>

            <button
              onClick={handleSaveAndPreview}
              className="bg-surface-brand text-text-white px-6 py-2 rounded-lg"
            >
              {tForm('saveAndPreview')}
            </button>
          </div>
        </div>
      </div>
      <VendorKycRequiredModal
        open={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
      />
    </div>
  );
}
