import type { ImgHTMLAttributes } from "react";
type Props = ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean; fill?: boolean };
export default function Image({ unoptimized: _u, priority: _p, fill: _f, alt, ...props }: Props) { return <img {...props} alt={alt || ""} />; }
