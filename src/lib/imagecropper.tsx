/* eslint-disable @next/next/no-img-element */
"use client"
import React, { useRef, useState, useEffect } from "react"
import ReactCrop, { Crop, PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ButtonType2, ButtonType3 } from "@/components/custom/button"

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

  // ✅ Add touch-action style on mount
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      .ReactCrop {
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
      }
      .ReactCrop__crop-selection {
        touch-action: none;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    imgRef.current = e.currentTarget
    
    // ✅ Wait for image to fully render with proper dimensions
    setTimeout(() => {
      if (!imgRef.current) return
      
      const { width, height } = imgRef.current
      const size = Math.min(width, height) * 0.8
      const x = (width - size) / 2
      const y = (height - size) / 2

      setCompletedCrop({
        unit: "px",
        x,
        y,
        width: size,
        height: size,
      })

      setCrop({
        unit: "%",
        x: (x / width) * 100,
        y: (y / height) * 100,
        width: (size / width) * 100,
        height: (size / height) * 100,
      })
    }, 100)
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

    canvas.width = pixelWidth
    canvas.height = pixelHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ✅ Circular mask
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          <h2 className="text-lg font-semibold">Crop Your Image</h2>
          
          {/* ✅ Add container with proper constraints */}
          <div 
            className="relative mx-auto max-w-full"
            style={{ 
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              circularCrop
              aspect={1}
              // ✅ Add these props for better mobile support
              ruleOfThirds={false}
              style={{ 
                maxWidth: '100%',
                touchAction: 'none'
              }}
            >
              <img
                ref={imgRef}
                alt="Crop preview"
                src={src}
                onLoad={onImageLoad}
                style={{ 
                  maxWidth: "100%", 
                  height: "auto",
                  display: "block"
                }}
              />
            </ReactCrop>
          </div>

          {/* Hidden canvas */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className="flex justify-end  items-center gap-2 mt-4">
            <ButtonType3 className="px-4 py-2" onClick={onCancel}>Cancel</ButtonType3>
            <ButtonType2 className="px-4 py-2"  onClick={generateCroppedImage}>Done</ButtonType2>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}