/** Scroll a tab button into the visible area of a horizontal tab track, preserving inline padding. */
export function scrollTabIntoTrackView(button: HTMLElement, track: HTMLElement) {
  const buttonRect = button.getBoundingClientRect()
  const trackRect = track.getBoundingClientRect()
  const trackStyle = getComputedStyle(track)
  const paddingLeft = parseFloat(trackStyle.paddingLeft) || 0
  const paddingRight = parseFloat(trackStyle.paddingRight) || 0

  if (buttonRect.left < trackRect.left) {
    track.scrollLeft -= trackRect.left - buttonRect.left + paddingLeft
  } else if (buttonRect.right > trackRect.right) {
    track.scrollLeft += buttonRect.right - trackRect.right + paddingRight
  }
}
