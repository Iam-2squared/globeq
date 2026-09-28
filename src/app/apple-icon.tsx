import { ImageResponse } from 'next/og';
import { Globe2 } from 'lucide-react';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#163d32',
      }}
    >
      <Globe2 size={112} color="#fffefa" strokeWidth={3.1} />
    </div>,
    size,
  );
}
