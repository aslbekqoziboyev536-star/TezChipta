import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  fallback, 
  className,
  ...props 
}) => {
  const { logoUrl } = useSettings();
  const defaultFallback = fallback || logoUrl;
  
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(defaultFallback);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};
