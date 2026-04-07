import * as React from "react";
import { Button } from "@react-email/components";

interface RejectButtonProps {
  href: string;
  children: React.ReactNode;
}

export function RejectButton({ href, children }: RejectButtonProps) {
  return (
    <Button
      href={href}
      className="rounded-md py-3 px-6 font-semibold text-destructive border border-solid border-destructive"
    >
      {children}
    </Button>
  );
}

export default RejectButton;
