"use client";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface PeopleYouMayKnowCardProps {
  profileImage: string;
  name: string;
  mutualConnections: number;
  onAddFriend?: () => void;
  buttonText?: string;
  buttonVariant?: "primary" | "secondary" | "success";
}

export default function PeopleYouMayKnowCard({
  profileImage,
  name,
  mutualConnections,
  onAddFriend,
  buttonText,
  buttonVariant = "primary",
}: PeopleYouMayKnowCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const t = useTranslations("home");
  const tActions = useTranslations("actions");

  const handleClick = () => {
    if (!isAdded && onAddFriend) {
      onAddFriend();
    }
    setIsAdded((prev) => !prev);
  };

  const getButtonStyles = () => {
    const baseStyles = "font-label-medium transition-colors truncate";
    if (isAdded) {
      return `${baseStyles} text-primary hover:text-secondary cursor-not-allowed`;
    }
    switch (buttonVariant) {
      case "secondary":
        return `${baseStyles} text-gray-700 hover:text-gray-900`;
      case "success":
        return `${baseStyles} text-green-600 hover:text-green-700`;
      default:
        return `${baseStyles} text-brand hover:text-brand-light`;
    }
  };

  const buttonLabel = isAdded
    ? t("added")
    : buttonText || tActions("addFriend");

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border-subtle hover:bg-surface-subtle transition-colors">
      {/* Left side - Profile info */}
      <div className="flex items-center gap-4">
        <Image
          width={40}
          height={40}
          src={profileImage}
          alt={`${name}'s profile`}
          className="w-10 h-10 rounded-full object-cover border border-border-subtle"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            // Fallback could be added here if needed
          }}
        />
        <div className="min-w-0"> {/* Prevents overflow */}
          <h3 className="font-caption-medium text-text-primary truncate">
            {name}
          </h3>
          <p className="font-body-small text-text-secondary truncate">
            {mutualConnections} {t("mutualConnections", { count: mutualConnections })}
          </p>
        </div>
      </div>

      {/* Right side - Action button */}
      <button
        className={`px-3 py-1 rounded-md ${getButtonStyles()}`}
        onClick={handleClick}
        disabled={isAdded}
        aria-label={isAdded ? t("added") : tActions("addFriend")}
      >
        {buttonLabel}
      </button>
    </div>
  );
}