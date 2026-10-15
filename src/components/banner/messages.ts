/** The words Banner says on its own. */
export interface BannerMessages {
  /** The landmark's name, when `label` is not set. */
  label: string
  /** The dismiss button, shown with `onDismiss`. */
  dismiss: string
  /** Read before a success banner's message, so the tone is not colour alone. */
  success: string
  /** Read before a warning banner's message. */
  warn: string
  /** Read before a danger banner's message. */
  danger: string
}

export const bannerMessages: BannerMessages = {
  label: 'Announcement',
  dismiss: 'Dismiss',
  success: 'Success:',
  warn: 'Warning:',
  danger: 'Error:',
}
