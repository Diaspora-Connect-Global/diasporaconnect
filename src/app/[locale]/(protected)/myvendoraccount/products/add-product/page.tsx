"use client";
import React from "react";

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

  const availableSizes = ["Small", "Medium", "Large", "X-Large"];

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

  const handleSaveDraft = () => {
    console.log("Saving as draft:", { ...formData, images, features, sizes });
    alert("Product saved as draft!");
  };

  const handleSaveAndAddAnother = () => {
    console.log("Saving and adding another:", {
      ...formData,
      images,
      features,
      sizes,
    });

    alert("Product saved! Ready to add another.");

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

  const handleSaveAndPreview = () => {
    console.log("Saving and previewing:", { ...formData, images, features, sizes });
    alert("Product saved! Opening preview...");
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button className="text-sm text-gray-600 hover:text-gray-800 mb-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Add a new product
        </button>

        <h1 className="text-2xl font-semibold text-gray-900">Add a new product</h1>
      </div>

      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Men's leather shoe"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Introducing our premium men's leather shoe..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            placeholder="300"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add image of product
          </label>

          <div className="grid grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                <img
                  src={img.preview}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full"
                >
                  ×
                </button>
              </div>
            ))}

            {images.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="text-gray-400 text-3xl">+</span>
              </label>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product category
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="Men fashion">Men fashion</option>
            <option value="Women fashion">Women fashion</option>
            <option value="Electronics">Electronics</option>
            <option value="Home & Garden">Home & Garden</option>
          </select>
        </div>

        {/* Price / Discount */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Price</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange("price", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Discount</label>
            <input
              type="number"
              value={formData.discount}
              onChange={(e) => handleInputChange("discount", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
          <label htmlFor="applyDiscount">Apply discount</label>
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Product features
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFeature()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />

            <button
              onClick={addFeature}
              className="px-4 py-2 text-blue-600"
            >
              + Add feature
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm"
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
          <label className="block text-sm font-medium mb-2">Size</label>

          <div className="flex gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                type="button"
                className={`px-4 py-2 border rounded-lg ${
                  sizes.includes(size)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <button onClick={handleSaveDraft} className="border px-6 py-2 rounded-lg">
            Save to draft
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSaveAndAddAnother}
              className="border px-6 py-2 rounded-lg"
            >
              Save and another
            </button>

            <button
              onClick={handleSaveAndPreview}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Save and preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
