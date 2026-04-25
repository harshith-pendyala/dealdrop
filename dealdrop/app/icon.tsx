// dealdrop/app/icon.tsx
import { ImageResponse } from 'next/og'

// Image metadata — Next.js reads these to build the <link rel="icon"> tag.
// 32×32 is the documented default favicon size and the standard browser-tab dimension.
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Default export returns Response | Blob | ArrayBuffer | TypedArray | DataView | ReadableStream.
// ImageResponse satisfies this and is the documented "easiest way to generate an icon".
//
// Constraints (from image-response.md):
//   - Flexbox + a subset of CSS only. Grid layout is not supported by Satori.
//   - 500KB bundle ceiling for the JSX + CSS + fonts + assets used inside ImageResponse.
//   - Custom fonts must be ttf, otf, or woff. Default fonts come from Vercel OG.
//
// Glyph: stylized "D" on zinc-900 (matches Shadcn new-york/zinc theme).
// No emoji (project convention).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          background: '#18181b', // zinc-900
          color: '#fafafa',      // zinc-50
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '-0.02em',
        }}
      >
        D
      </div>
    ),
    {
      ...size,
    }
  )
}
