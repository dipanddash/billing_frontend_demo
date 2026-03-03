const ENTER_ACTION_LABEL = /\b(proceed|pay|payment|send|submit|confirm|save|create|load report|place order|checkout)\b/i;

const isElementVisible = (el: HTMLElement) => {
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
};

const isEligibleInputTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.closest("[contenteditable='true']")) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return false;
  if (tag !== "input" && tag !== "select") return false;

  const input = el as HTMLInputElement;
  const type = (input.type || "").toLowerCase();
  if (["button", "submit", "reset", "checkbox", "radio", "file"].includes(type)) return false;
  return true;
};

const pickActionButton = (scope: ParentNode) => {
  const buttons = Array.from(scope.querySelectorAll("button")) as HTMLButtonElement[];
  const candidates = buttons.filter((btn) => !btn.disabled && isElementVisible(btn));
  if (!candidates.length) return null;

  const explicit = candidates.find((btn) => btn.dataset.enterAction === "true");
  if (explicit) return explicit;

  const byLabel = candidates.find((btn) => ENTER_ACTION_LABEL.test((btn.textContent || "").trim()));
  if (byLabel) return byLabel;

  return null;
};

export const handleEnterPrimaryAction = (event: KeyboardEvent) => {
  if (event.key !== "Enter") return;
  if (event.defaultPrevented) return;
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  if (!isEligibleInputTarget(event.target)) return;

  const active = event.target as HTMLElement;
  const form = active.closest("form") as HTMLFormElement | null;
  if (form) {
    event.preventDefault();
    form.requestSubmit();
    return;
  }

  const scopedDialog =
    (active.closest("[role='dialog']") as ParentNode | null) ||
    (active.closest("[aria-modal='true']") as ParentNode | null) ||
    (active.closest(".fixed") as ParentNode | null);
  const scope = scopedDialog || document;
  const actionButton = pickActionButton(scope);
  if (!actionButton) return;

  event.preventDefault();
  actionButton.click();
};

