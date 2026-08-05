import type { ReactNode } from "react";

// Mobile-landscape-first layout: header and footer are always visible
// (never scroll off), only the middle content area scrolls if it doesn't
// fit. Sized against a ~390px-tall landscape phone viewport (iPhone
// landscape), which is short enough that a naive centered-column layout
// pushes action buttons below the fold - see docs/SYSTEM_LAYER.md task 5.
// Fills its parent (h-full) rather than the raw browser viewport (h-dvh)
// so it works correctly inside DeviceFrame's fixed-size box on desktop,
// not just full-bleed on an actual phone.
export function ScreenShell({
  header,
  footer,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-[#10272e] text-[#f2ead9]">
      {header && <div className="shrink-0 px-4 pt-3 pb-2 text-center">{header}</div>}
      <div className="flex-1 overflow-y-auto px-4">{children}</div>
      {footer && <div className="shrink-0 px-4 py-3">{footer}</div>}
    </div>
  );
}
