import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRoomCode(value: string) {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "");
  if (/^[0-9A-Z]{4}$/.test(cleaned)) {
    return `QR-${cleaned}`;
  }
  return cleaned;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
