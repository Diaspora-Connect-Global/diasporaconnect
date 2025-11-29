'use client';
import React, { useState } from 'react';
import { ButtonType2, ButtonType3 } from '../custom/button';

interface Slide {
  title: string;
  description: string;
  image?: React.ReactNode;
}

interface OnboardingProps {
  onFinish: () => void;
}

const slides: Slide[] = [
  {
    title: "Let's Get Your Business Online",
    description:
      "Whether you sell products or provide services, we'll help you set up your vendor account in minutes and help you reach potential customers in both the local and diaspora communities"
  },
  {
    title: "Grow Your Business With New Customers",
    description:
      "Build trust and sell with confidence. Connect with a wider audience ready to buy your products or book your services. Showcase what you offer, and start getting discovered instantly."
  },
  {
    title: "Verified Sales With Secure Escrow",
    description:
      "Our escrow payment system protects both you and your customers. Payments are held safely until orders are completed or product is received, giving everyone confidence throughout the transaction"
  }
];

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onFinish();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    setCurrentIndex(2);
  };

  return (
    <div className="w-full h-full my-auto flex flex-col justify-center  ">

      {/* Image / Top */}
      <div className="lg:h-[45vh] flex items-center p-5   rounded-xl border border-surface-brand-light justify-center">
        {slides[currentIndex].image ?? (
          <div className="w-full h-full bg-surface-disabled rounded-xl" />
        )}
      </div>

      {/* Text */}
      <div className="text-center space-y-2 my-2 ">
        <h2 className=" heading-medium">
          {slides[currentIndex].title}
        </h2>
        <p className="text-text-secondary body-large">
          {slides[currentIndex].description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 my-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === currentIndex ? 'bg-surface-brand w-4' : 'bg-surface-disabled w-2'
            }`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between">
        {!isLastSlide ? (
          <ButtonType3
            onClick={handleSkip}
            className="font-medium"
          >
            Skip
          </ButtonType3>
        ) : (
          <div />
        )}

        <ButtonType2
          onClick={handleNext}
          className="  px-6 py-3 rounded-full font-medium"
        >
          {isLastSlide ? 'Finish' : 'Next'}
        </ButtonType2>
      </div>
    </div>
  );
}
