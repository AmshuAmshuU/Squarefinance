import React from "react";
import Image from "next/image";

const Logo = ({ className = "", showText = true, size = "md" }) => {
  const sizeClasses = {
    sm: {
      width: 48,
      height: 48,
    },
    md: {
      width: 80,
      height: 80,
    },
    lg: {
      width: 140,
      height: 140,
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div 
      className={`relative ${className}`}
      style={{ width: currentSize.width, height: currentSize.height }}
    >
      <Image
        src="/logo.jpg"
        alt="Square Finance"
        fill
        sizes="(max-width: 768px) 100vw, 150px"
        className="object-contain rounded-sm"
        priority
      />
    </div>
  );
};

export default Logo;
