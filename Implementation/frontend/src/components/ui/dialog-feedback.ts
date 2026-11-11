/** Dismissing a toast must not dismiss or move focus outside an open Radix dialog. */
export function preserveToastInteraction(event: CustomEvent<{ originalEvent: Event }>) {
  const target = event.detail.originalEvent.target;
  if (target instanceof Element && target.closest(".toast-viewport")) event.preventDefault();
}
