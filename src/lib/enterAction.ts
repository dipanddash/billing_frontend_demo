const ENTER_ACTION_LABEL =
  /\b(proceed|pay|payment|send|submit|confirm|save|create|update|apply|start|continue|login|sign in|place order|checkout|enter)\b/i;

const isElementVisible = (el: HTMLElement) => {
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
};

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.closest("[contenteditable='true']")) return true;

  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag !== "input" && tag !== "select") return false;

  const input = el as HTMLInputElement;
  const type = (input.type || "").toLowerCase();
  if (["button", "reset", "checkbox", "radio", "file"].includes(type)) return false;
  return true;
};

const pickActionButton = (scope: ParentNode) => {
  const actionElements = Array.from(
    scope.querySelectorAll(
      "button, input[type='submit'], input[type='button'], [role='button'], [data-enter-action='true']"
    )
  ) as HTMLElement[];
  const candidates = actionElements.filter((el) => {
    const html = el as HTMLButtonElement & HTMLInputElement;
    return !html.disabled && isElementVisible(el);
  });
  if (!candidates.length) return null;

  const explicit = candidates.find((el) => (el as HTMLElement).dataset.enterAction === "true");
  if (explicit) return explicit;

  const byLabel = candidates.find((el) => {
    const inputValue = (el as HTMLInputElement).value;
    const text = (el.textContent || inputValue || "").trim();
    return ENTER_ACTION_LABEL.test(text);
  });
  if (byLabel) return byLabel;

  return null;
};

export const handleEnterPrimaryAction = (event: KeyboardEvent) => {
  if (event.key !== "Enter") return;
  if (event.defaultPrevented) return;
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

  const active = event.target as HTMLElement;
  const typingTarget = isTypingTarget(event.target);
  const isTextarea = active?.tagName?.toLowerCase() === "textarea";
  if (typingTarget && isTextarea && active.dataset.enterSubmit !== "true") {
    return;
  }

  const scopedDialog =
    (active.closest("[role='dialog']") as ParentNode | null) ||
    (active.closest("[aria-modal='true']") as ParentNode | null) ||
    (active.closest(".fixed") as ParentNode | null);
  const scope = scopedDialog || document;

  if (typingTarget) {
    const form = active.closest("form") as HTMLFormElement | null;
    if (form) {
      event.preventDefault();
      form.requestSubmit();
      return;
    }
  } else {
    if (!scopedDialog) return;
  }

  const actionButton = pickActionButton(scope);
  if (!actionButton) return;

  event.preventDefault();
  (actionButton as HTMLElement).click();
};
