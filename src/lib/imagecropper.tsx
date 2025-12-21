"use client"

import React, { useRef, useState } from "react"
import ReactCrop, { Crop, PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ImageCropperProps {
  open: boolean
  src: string
  onCancel: () => void
  onConfirm: (croppedImage: string) => void
}

export function CircularImageCropper({
  open,
  src,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 60,
    height: 60,
    x: 20,
    y: 20,
  })

  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    imgRef.current = e.currentTarget
    
    // ✅ Set initial completed crop when image loads
    const { width, height } = e.currentTarget
    setCompletedCrop({
      unit: "px",
      x: width * 0.2,
      y: height * 0.2,
      width: width * 0.6,
      height: height * 0.6,
    })
  }

  function generateCroppedImage() {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return

    const image = imgRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const pixelWidth = Math.floor(completedCrop.width * scaleX)
    const pixelHeight = Math.floor(completedCrop.height * scaleY)

    // ✅ CRITICAL: canvas must match REAL pixel size
    canvas.width = pixelWidth
    canvas.height = pixelHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ✅ circular mask
    ctx.save()
    ctx.beginPath()
    ctx.arc(
      pixelWidth / 2,
      pixelHeight / 2,
      Math.min(pixelWidth, pixelHeight) / 2,
      0,
      Math.PI * 2
    )
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      pixelWidth,
      pixelHeight,
      0,
      0,
      pixelWidth,
      pixelHeight
    )

    ctx.restore()

    onConfirm(canvas.toDataURL("image/png"))
  }

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          circularCrop
          aspect={1}
        >
          <img src={src} onLoad={onImageLoad} />
        </ReactCrop>

        {/* hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={generateCroppedImage}>Done</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}