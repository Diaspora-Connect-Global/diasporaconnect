"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { UPDATE_PRODUCT, LIST_VENDOR_PRODUCTS } from "@/services/gql/vendor";
import { GET_PRODUCT } from "@/services/gql/marketplace";
import type { GetProductResponse } from "@/services/gql/types/marketplace";
import { handleVendorError } from "@/lib/vendor-error-mapper";

export default function EditProductPage() {
  const params = useParams();
  const productId = params?.id as string;
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("vendors.products");
  const tForm = useTranslations("vendors.products.form");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [inventoryCount, setInventoryCount] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [ready, setReady] = useState(false);

  const { data, loading: fetching } = useQuery<GetProductResponse>(GET_PRODUCT, {
    variables: { product_id: productId },
    skip: !productId,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const p = data?.getProduct?.product;
    if (p && !ready) {
      setTitle(p.title ?? "");
      setDescription(p.description ?? "");
      setPrice(((p.price ?? 0) / 100).toFixed(2));
      setInventoryCount(String(p.inventory_count ?? ""));
      setTags(p.tags ?? []);
      setReady(true);
    }
  }, [data, ready]);

  const [updateProduct, { loading: saving }] = useMutation<{ updateProduct: boolean }>(
    UPDATE_PRODUCT
  );

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) setTags((prev) => [...prev, val]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !price || !inventoryCount) {
      toast.error("Please fill in all required fields");
      return;
    }
    const priceMinor = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceMinor) || priceMinor <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    try {
      const { data: mutData } = await updateProduct({
        variables: {
          productId,
          title: title.trim(),
          description: description.trim(),
          price: priceMinor,
          inventoryCount: Number(inventoryCount),
          tags,
        },
        refetchQueries: [{ query: LIST_VENDOR_PRODUCTS }],
      });
      if (!mutData?.updateProduct) {
        toast.error("Failed to update product");
        return;
      }
      toast.success("Product updated");
      router.push(`/${locale}/vendors/products`);
    } catch (error) {
      handleVendorError({ error, locale, router });
    }
  };

  if (fetching && !ready) {
    return (
      <div className="p-8">
        <p className="text-text-secondary">Loading product…</p>
      </div>
    );
  }

  if (!data?.getProduct?.product && !fetching) {
    return (
      <div className="p-8">
        <p className="text-text-danger">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
        <button onClick={() => router.push(`/${locale}/vendors/products`)} className="hover:text-text-primary">
          {t("title")}
        </button>
        <span>›</span>
        <span className="text-text-primary">{t("editProduct") || "Edit product"}</span>
      </div>

      <h1 className="text-2xl font-semibold text-text-primary mb-8">{t("editProduct") || "Edit product"}</h1>

      <div className="bg-surface-default rounded-xl border border-border-subtle p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {tForm("productName") || "Product name"} <span className="text-text-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {tForm("description") || "Description"} <span className="text-text-danger">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default resize-none"
          />
        </div>

        {/* Price and Inventory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {tForm("price") || "Price (GHS)"} <span className="text-text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {tForm("quantity") || "Inventory count"} <span className="text-text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={inventoryCount}
              onChange={(e) => setInventoryCount(e.target.value)}
              className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Tags</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-surface-subtle rounded-full text-sm text-text-primary">
                {tag}
                <button onClick={() => removeTag(tag)} className="text-text-tertiary hover:text-text-danger ml-1 leading-none">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add a tag…"
              className="flex-1 px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default text-sm"
            />
            <button
              onClick={addTag}
              className="px-4 py-2 bg-surface-subtle rounded-lg text-sm font-medium hover:bg-surface-disabled transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => router.push(`/${locale}/vendors/products`)}
          className="px-6 py-2.5 border border-border-subtle rounded-lg text-sm font-medium hover:bg-surface-subtle transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-surface-brand text-text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
