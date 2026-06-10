import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function CachedImage({ src, alt, className }) {
    const [imgSrc, setImgSrc] = useState(null);

    useEffect(() => {
        if (!src) return;

        let isMounted = true;
        const proxyUrl = `${API_BASE}/books/cover?url=${encodeURIComponent(src)}`;

        const loadImage = async () => {
            try {
                const cache = await caches.open('sanad-image-cache');
                const cachedResponse = await cache.match(proxyUrl);
                
                if (cachedResponse) {
                    const blob = await cachedResponse.blob();
                    if (isMounted) setImgSrc(URL.createObjectURL(blob));
                } else {
                    const response = await fetch(proxyUrl);
                    if (response.ok) {
                        cache.put(proxyUrl, response.clone());
                        const blob = await response.blob();
                        if (isMounted) setImgSrc(URL.createObjectURL(blob));
                    } else {
                        if (isMounted) setImgSrc(src);
                    }
                }
            } catch (err) {
                if (isMounted) setImgSrc(src);
            }
        };

        loadImage();

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (!imgSrc) return <div className={`bg-slate-200 animate-pulse ${className}`} />;

    return <img src={imgSrc} alt={alt || ''} className={className} />;
}
