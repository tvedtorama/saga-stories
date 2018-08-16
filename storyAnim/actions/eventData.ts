export const SET_EVENT_DATA = "SET_EVENT_DATA"

/** Post new event data, such as scroll position or time. See @link StoryAnim.IEventData */
export const setEventData = (eventData: StoryAnim.IEventData) => ({type: SET_EVENT_DATA, eventData})