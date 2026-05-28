type PopoverCloseHandler = () => void

const closeHandlers = new Set<PopoverCloseHandler>()

/** Register a callback for when the prototype user settings popover closes. */
export function onPrototypeUserSettingsPopoverClose(handler: PopoverCloseHandler): void {
  closeHandlers.add(handler)
}

export function offPrototypeUserSettingsPopoverClose(handler: PopoverCloseHandler): void {
  closeHandlers.delete(handler)
}

export function notifyPrototypeUserSettingsPopoverClosed(): void {
  for (const handler of closeHandlers) {
    handler()
  }
}
