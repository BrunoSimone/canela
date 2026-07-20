"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const arrowClass =
  "size-9 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  title: string;
  startIndex?: number;
}

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  title,
  startIndex = 0,
}: ImageLightboxProps) {
  const [api, setApi] = useState<CarouselApi>();
  const count = images.length;

  useEffect(() => {
    if (!open || !api) return;
    const id = window.setTimeout(() => api.reInit(), 60);
    return () => window.clearTimeout(id);
  }, [open, api]);

  if (count === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] w-[96vw] max-w-[96vw] items-center justify-center border-0 bg-[rgba(40,28,20,.96)] p-0 ring-0 sm:max-w-[92vw]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <X className="size-6" />
        </button>

        <Carousel
          opts={{ startIndex, loop: count > 1 }}
          className="w-full"
          setApi={setApi}
        >
          <CarouselContent className="ml-0">
            {images.map((url, i) => (
              <CarouselItem key={url} className="pl-0">
                <div className="relative h-[85vh] w-full">
                  <Image
                    src={url}
                    alt={`${title} — foto ${i + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {count > 1 && (
            <>
              <CarouselPrevious className={cn("left-3", arrowClass)} />
              <CarouselNext className={cn("right-3", arrowClass)} />
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
