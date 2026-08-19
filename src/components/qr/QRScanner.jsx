import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, StopCircle, AlertCircle } from "lucide-react";
import jsQR from "jsqr";

export default function QRScanner({ onScan, onError }) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animationRef = useRef(null);
    const barcodeDetectorRef = useRef(null);
    const decodingRef = useRef(false);
    const hasScannedRef = useRef(false);

    const startScanning = async () => {
        try {
            setError(null);
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('CAMERA_UNSUPPORTED');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });

            streamRef.current = stream;
            hasScannedRef.current = false;
            decodingRef.current = false;
            if ('BarcodeDetector' in window) {
                try {
                    barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
                } catch {
                    barcodeDetectorRef.current = null;
                }
            }
            setIsScanning(true);
        } catch (err) {
            const message = err?.message === 'CAMERA_UNSUPPORTED'
                ? 'Ce navigateur ne permet pas l’accès à la caméra.'
                : err?.name === 'NotAllowedError'
                    ? 'Autorisez la caméra dans le navigateur, puis réessayez.'
                    : err?.name === 'NotFoundError'
                        ? 'Aucune caméra n’a été trouvée sur cet appareil.'
                        : "Impossible d'accéder à la caméra. Vérifiez les permissions et utilisez HTTPS.";
            setError(message);
            onError?.(err);
        }
    };

    const stopScanning = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        decodingRef.current = false;
        barcodeDetectorRef.current = null;
        setIsScanning(false);
    };

    const scanQRCode = async () => {
        if (!videoRef.current || !canvasRef.current || hasScannedRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
            animationRef.current = requestAnimationFrame(scanQRCode);
            return;
        }
        if (decodingRef.current) {
            animationRef.current = requestAnimationFrame(scanQRCode);
            return;
        }

        decodingRef.current = true;
        try {
            // A smaller, stable frame is much faster and more reliable on iPhone Safari.
            const maxWidth = 720;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (barcodeDetectorRef.current) {
                try {
                    const barcodes = await barcodeDetectorRef.current.detect(canvas);
                    if (barcodes.length > 0 && barcodes[0].rawValue) {
                        hasScannedRef.current = true;
                        onScan(barcodes[0].rawValue);
                        stopScanning();
                        return;
                    }
                } catch (err) {
                    console.warn('BarcodeDetector indisponible, fallback jsQR utilisé.', err);
                    barcodeDetectorRef.current = null;
                }
            }

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
            });
            if (qrCode?.data) {
                hasScannedRef.current = true;
                onScan(qrCode.data);
                stopScanning();
                return;
            }
        } finally {
            decodingRef.current = false;
        }

        animationRef.current = requestAnimationFrame(scanQRCode);
    };

    useEffect(() => {
        if (!isScanning || !streamRef.current || !videoRef.current) return;

        const video = videoRef.current;
        video.srcObject = streamRef.current;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        const startVideo = async () => {
            try {
                await video.play();
                if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    scanQRCode();
                }
            } catch (err) {
                setError('La caméra est autorisée mais la vidéo ne démarre pas. Touchez à nouveau « Commencer le scan ».');
                onError?.(err);
            }
        };

        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            startVideo();
        } else {
            video.onloadedmetadata = startVideo;
        video.oncanplay = startVideo;
        }

        return () => {
            video.onloadedmetadata = null;
            video.oncanplay = null;
        };
    }, [isScanning]);

    useEffect(() => {
        return () => {
            stopScanning();
        };
    }, []);

    return (
        <Card className="border-0 shadow-2xl">
            <CardContent className="p-6">
                <div className="space-y-4">
                    <div className="relative bg-gray-900 rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
                        {isScanning ? (
                            <>
                                <video
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                    <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 border-4 border-[#1458B8] rounded-2xl animate-pulse">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1458B8] rounded-tl-2xl"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1458B8] rounded-tr-2xl"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1458B8] rounded-bl-2xl"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1458B8] rounded-br-2xl"></div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full py-20">
                                <div className="text-center text-gray-400">
                                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Appuyez pour scanner</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <Button
                        onClick={isScanning ? stopScanning : startScanning}
                        className={`w-full py-6 text-lg font-semibold ${isScanning
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'msa-gradient hover:opacity-95'
                            }`}
                        size="lg"
                    >
                        {isScanning ? (
                            <>
                                <StopCircle className="w-5 h-5 mr-2" />
                                Arrêter le scan
                            </>
                        ) : (
                            <>
                                <Camera className="w-5 h-5 mr-2" />
                                Commencer le scan
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
