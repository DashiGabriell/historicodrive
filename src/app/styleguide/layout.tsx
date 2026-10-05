import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design system — HistóricoDrive",
  robots: { index: false, follow: false },
};

export default function StyleguideLayout({ children }: LayoutProps<"/styleguide">) {
  return children;
}
