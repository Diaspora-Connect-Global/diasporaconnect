"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, Heart, Minus, Plus, Search, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import type { CartItem, Product } from "./types";

export function ServiceDetail({
  service,
  onBack,
  onContinue,
}: {
  service: Product;
  onBack: () => void;
  onContinue: (item: CartItem) => void;
}) {
  const t = useTranslations("marketplace");
  const [projectDuration, setProjectDuration] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<
    "basic" | "standard" | "premium"
  >("basic");
  const [quantity, setQuantity] = useState(1);
  const [showExtras, setShowExtras] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const packages = useMemo(
    () => ({
      basic: {
        price: 150,
        features: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
      standard: {
        price: 300,
        features: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
      },
      premium: {
        price: 450,
        features: [
          "Feature 1",
          "Feature 2",
          "Feature 3",
          "Feature 4",
          "Feature 5",
          "Feature 6",
        ],
      },
    }),
    []
  );

  const extras = useMemo(
    () => [
      {
        id: "source",
        name: "Include source file",
        description: "You will get original file you can use to edit the performance",
        price: 125,
      },
      {
        id: "source2",
        name: "Include source file",
        description: "You will get original file you can use to edit the performance",
        price: 125,
      },
    ],
    []
  );

  const toggleExtra = (extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const handleContinue = () => {
    onContinue({
      ...service,
      quantity,
      projectDuration,
      selectedPackage,
      extras: selectedExtras,
      price: packages[selectedPackage].price,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ButtonType3
        onClick={onBack}
        className="p-0 min-w-0 border-0 bg-transparent flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-800"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>{service.name}</span>
      </ButtonType3>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center text-9xl mb-4">
            {service.image}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center text-3xl cursor-pointer hover:ring-2 ring-blue-500"
              >
                {service.image}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="font-semibold mb-2">{t("aboutService")}</h3>
            <p className="text-sm text-gray-600">{t("serviceDescription")}</p>
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <span className="text-sm text-gray-600">{service.seller}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{service.name}</h2>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{service.rating}</span>
                <span className="text-gray-500">({service.reviews})</span>
              </div>
            </div>
            <div className="flex gap-2">
              <ButtonType3 className="p-2 rounded-full hover:bg-gray-100 border-0 bg-transparent min-w-0">
                <Heart className="w-5 h-5" />
              </ButtonType3>
              <ButtonType3 className="p-2 rounded-full hover:bg-gray-100 border-0 bg-transparent min-w-0">
                <Search className="w-5 h-5" />
              </ButtonType3>
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2">{t("projectDuration")}</label>
            <input
              type="number"
              value={projectDuration}
              onChange={(e) => setProjectDuration(Number(e.target.value))}
              placeholder={t("projectDurationPlaceholder")}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2">{t("packages")}</label>
            <div className="space-y-3">
              {Object.entries(packages).map(([key, pkg]) => (
                <div
                  key={key}
                  onClick={() =>
                    setSelectedPackage(key as "basic" | "standard" | "premium")
                  }
                  className={`border rounded-lg p-4 cursor-pointer ${
                    selectedPackage === key
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{key}</span>
                    <span className="font-bold">GH₵{pkg.price.toFixed(2)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">{t("quantity")}</h3>
            <div className="flex items-center gap-4">
              <ButtonType3
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 border rounded bg-transparent min-w-0 hover:bg-gray-100"
                aria-label={t("decreaseQuantity")}
              >
                <Minus className="w-4 h-4" />
              </ButtonType3>
              <span className="text-lg font-medium">{quantity}</span>
              <ButtonType3
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 border rounded bg-transparent min-w-0 hover:bg-gray-100"
                aria-label={t("increaseQuantity")}
              >
                <Plus className="w-4 h-4" />
              </ButtonType3>
            </div>
          </div>

          <ButtonType2
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 mb-4"
          >
            {t("continue")}
          </ButtonType2>

          <ButtonType3
            onClick={() => setShowExtras(true)}
            className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 bg-transparent"
          >
            {t("addExtras")}
          </ButtonType3>
        </div>
      </div>

      {showExtras && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{t("addExtras")}</h3>
              <ButtonType3
                onClick={() => setShowExtras(false)}
                className="p-0 min-w-0 border-0 bg-transparent text-gray-500 hover:text-gray-700"
                aria-label={t("close")}
              >
                <X className="w-5 h-5" />
              </ButtonType3>
            </div>
            <div className="space-y-4 mb-6">
              {extras.map((extra) => (
                <label key={extra.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedExtras.includes(extra.id)}
                    onChange={() => toggleExtra(extra.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{extra.name}</span>
                      <span className="font-bold">GH₵{extra.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{extra.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <ButtonType3
                onClick={() => setShowExtras(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 bg-transparent"
              >
                {t("noExtraServices")}
              </ButtonType3>
              <ButtonType2
                onClick={() => {
                  setShowExtras(false);
                  handleContinue();
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                {t("addExtrasAmount", { amount: selectedExtras.length * 125 })}
              </ButtonType2>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

