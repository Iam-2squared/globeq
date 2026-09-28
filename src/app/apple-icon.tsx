import { ImageResponse } from 'next/og';

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
      <svg width="118" height="118" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="24" fill="none" stroke="#fffefa" strokeWidth="5" />
        <path d="M8 32h48" fill="none" stroke="#fffefa" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M32 8c-14 15-14 33 0 48" fill="none" stroke="#fffefa" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M32 8c14 15 14 33 0 48" fill="none" stroke="#fffefa" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    </div>,
    size,
  );
}
