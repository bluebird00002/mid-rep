import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import "./ImageCropper.css";

function ImageCropper({ imageFile, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    if (!imageFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(e.target.result);
        setImageDimensions({ width: img.width, height: img.height });
        // Reset controls
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Draw image on canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const size = 400; // Size of circular crop area

    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, size, size);

    // Load and transform image
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(-size / 2 + position.x, -size / 2 + position.y);

      // Draw image
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();

      // Draw circle overlay
      ctx.strokeStyle = "rgba(255, 166, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    };
    img.src = image;
  }, [image, zoom, rotation, position]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setPosition({
      x: position.x + dx * 0.5,
      y: position.y + dy * 0.5,
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;

    setPosition({
      x: position.x + dx * 0.5,
      y: position.y + dy * 0.5,
    });
    setDragStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (newZoom) => {
    setZoom(Math.max(0.5, Math.min(5, newZoom)));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      onCrop(blob);
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="image-cropper-overlay">
      <motion.div
        className="image-cropper-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="cropper-header">
          <h2>Crop Profile Picture</h2>
          <button className="close-btn" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>

        <div className="cropper-body">
          <div className="cropper-preview-section">
            <p className="cropper-label">Drag to position • Scroll to zoom</p>
            <div
              ref={containerRef}
              className="cropper-container"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <canvas
                ref={canvasRef}
                className="cropper-canvas"
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  handleZoomChange(zoom + delta);
                }}
              />
            </div>
          </div>

          <div className="cropper-controls-section">
            <div className="controls-group">
              <label>Zoom Level</label>
              <div className="zoom-slider-container">
                <button
                  className="zoom-btn"
                  onClick={() => handleZoomChange(zoom - 0.1)}
                >
                  <ZoomOut size={18} />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="zoom-slider"
                />
                <button
                  className="zoom-btn"
                  onClick={() => handleZoomChange(zoom + 0.1)}
                >
                  <ZoomIn size={18} />
                </button>
                <span className="zoom-value">{zoom.toFixed(1)}x</span>
              </div>
            </div>

            <div className="controls-group">
              <button className="control-btn reset-btn" onClick={handleReset}>
                <RotateCcw size={18} />
                Reset
              </button>
              <button className="control-btn rotate-btn" onClick={handleRotate}>
                <RotateCcw size={18} />
                Rotate 90°
              </button>
            </div>

            <div className="image-info">
              <p>Original size: {imageDimensions.width} × {imageDimensions.height}px</p>
              <p>Minimum recommended: 200 × 200px</p>
              <p>Current zoom: {zoom.toFixed(1)}x, Rotation: {rotation}°</p>
            </div>
          </div>
        </div>

        <div className="cropper-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-crop" onClick={handleCrop}>
            Use This Picture
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ImageCropper;
