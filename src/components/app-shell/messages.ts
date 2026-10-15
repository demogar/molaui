/** The words AppShell and SidebarToggle say on their own. */
export interface AppShellMessages {
  /** Names the landmark that holds the skip link. */
  skipLinks: string
  /** The skip link, the first stop on Tab. */
  skipToContent: string
  /** The heading of the navigation sheet on a phone. */
  navigation: string
  /** The sheet's close button. */
  closeNavigation: string
  /** SidebarToggle on a desktop, while the sidebar is a rail. */
  expandSidebar: string
  /** SidebarToggle on a desktop, while the sidebar is open. */
  collapseSidebar: string
  /** SidebarToggle on a phone. */
  openNavigation: string
}

export const appShellMessages: AppShellMessages = {
  skipLinks: 'Skip links',
  skipToContent: 'Skip to content',
  navigation: 'Navigation',
  closeNavigation: 'Close navigation',
  expandSidebar: 'Expand sidebar',
  collapseSidebar: 'Collapse sidebar',
  openNavigation: 'Open navigation',
}
