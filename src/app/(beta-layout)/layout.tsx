import { appConfig } from "@/shared/lib/config";
import { Metadata } from "next";
import React from "react";
import { Header } from "@/shared/layout/header";

export const metadata: Metadata = {
  title: {
    template: "%s | " + appConfig.projectName,
    default: appConfig.projectName,
  },
  description: appConfig.description,
};

function BetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="-mt-14">{children}</main>
    </div>
  );
}

export default BetaLayout;
