/** The words TagGroup says on its own. */
export interface TagGroupMessages {
  /** Each remove button's name, when `removeLabel` is not set. `{name}` is the tag's label. */
  remove: string
  /** What an empty group says, when `empty` is not set. */
  empty: string
}

export const tagGroupMessages: TagGroupMessages = {
  remove: 'Remove {name}',
  empty: 'None',
}
