import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../../components/ui/primitives";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";

/** Admin list filters share the Overview modal behavior; closing unmounts and discards local form drafts. */
export function AdminFilterDialog({ title, description, disabled = false, children }: {
  title: string; description: string; disabled?: boolean; children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null), fallback = useRef<HTMLElement | null>(null), restoreAfterRead = useRef(false);
  useEffect(() => {
    // Applying inventory filters can disable the trigger while its new page is loading.
    if (!open && !disabled && restoreAfterRead.current) {
      if (document.activeElement === fallback.current || document.activeElement === document.body) trigger.current?.focus();
      restoreAfterRead.current = false;
    }
  }, [open, disabled]);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button ref={trigger} variant="secondary" disabled={disabled}><SlidersHorizontal size={17} aria-hidden="true" />Filter</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content ref={content} className="dialog-content admin-dialog admin-filter-dialog" onInteractOutside={preserveToastInteraction} onOpenAutoFocus={event => {
        const first = content.current?.querySelector<HTMLInputElement | HTMLSelectElement>("input:not(:disabled), select:not(:disabled)");
        if (first) { event.preventDefault(); first.focus(); }
      }} onCloseAutoFocus={event => {
        event.preventDefault();
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        if (trigger.current && !trigger.current.disabled) trigger.current.focus();
        else { fallback.current = document.querySelector<HTMLElement>("#main-content h1"); fallback.current?.focus(); restoreAfterRead.current = true; }
      }}>
        <div className="admin-dialog-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" aria-label="Close filters"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
        <Dialog.Description>{description}</Dialog.Description>
        {children(() => setOpen(false))}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
